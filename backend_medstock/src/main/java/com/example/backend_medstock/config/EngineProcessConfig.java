package com.example.backend_medstock.config;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;

/**
 * Porneste automat serviciul AI Engine (engine_service.py) ca sub-proces
 * atunci cand Spring Boot este gata, si il opreste la shutdown.
 *
 * Configurare in application.properties:
 *   engine.enabled=true
 *   engine.python-executable=py
 *   engine.host=127.0.0.1
 *   engine.port=8001
 *   engine.script-dir=../medistock-engine/engine
 *   engine.auto-refresh-enabled=true
 *   engine.auto-refresh-interval-seconds=15
 */
@Configuration
public class EngineProcessConfig {

    private static final Logger log = LoggerFactory.getLogger(EngineProcessConfig.class);

    @Value("${engine.enabled:true}")
    private boolean engineEnabled;

    @Value("${engine.python-executable:py}")
    private String pythonExecutable;

    @Value("${engine.host:127.0.0.1}")
    private String engineHost;

    @Value("${engine.port:8001}")
    private int enginePort;

    @Value("${engine.script-dir:../medistock-engine/engine}")
    private String scriptDir;

    @Value("${engine.auto-refresh-enabled:true}")
    private boolean autoRefreshEnabled;

    @Value("${engine.auto-refresh-interval-seconds:15}")
    private int autoRefreshIntervalSeconds;

    private Process engineProcess;

    @EventListener(ApplicationReadyEvent.class)
    public void startEngineService() {
        if (!engineEnabled) {
            log.info("[EngineProcess] Engine service is disabled (engine.enabled=false)");
            return;
        }

        File workingDir = new File(scriptDir).getAbsoluteFile();
        if (!workingDir.isDirectory()) {
            log.error("[EngineProcess] Script directory does not exist: {}", workingDir.getAbsolutePath());
            return;
        }

        File engineScript = new File(workingDir, "engine/engine_service.py");
        if (!engineScript.exists()) {
            log.error("[EngineProcess] engine_service.py not found in: {}", new File(workingDir, "engine").getAbsolutePath());
            return;
        }

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    pythonExecutable, "-m", "uvicorn",
                    "engine.engine_service:app",
                    "--host", engineHost,
                    "--port", String.valueOf(enginePort)
            );

            pb.directory(workingDir);

            // Seteaza variabilele de mediu pentru auto-refresh
            pb.environment().put("AUTO_REFRESH_ENABLED", String.valueOf(autoRefreshEnabled));
            pb.environment().put("AUTO_REFRESH_INTERVAL_SECONDS", String.valueOf(autoRefreshIntervalSeconds));

            // Redirectam stderr catre stdout
            pb.redirectErrorStream(true);

            engineProcess = pb.start();

            log.info("[EngineProcess] Started engine_service.py (PID: {}) on {}:{}",
                    engineProcess.pid(), engineHost, enginePort);

            // Thread dedicat pentru a citi si loga output-ul engine-ului
            Thread logThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(engineProcess.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        log.info("[AI Engine] {}", line);
                    }
                } catch (IOException e) {
                    if (engineProcess != null && engineProcess.isAlive()) {
                        log.warn("[EngineProcess] Error reading engine output: {}", e.getMessage());
                    }
                }
            }, "engine-log-reader");
            logThread.setDaemon(true);
            logThread.start();

            // Verificam ca procesul nu a crapat imediat
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            if (!engineProcess.isAlive()) {
                log.error("[EngineProcess] Engine process exited immediately with code: {}",
                        engineProcess.exitValue());
            } else {
                log.info("[EngineProcess] Engine service is running successfully");
            }

        } catch (IOException e) {
            log.error("[EngineProcess] Failed to start engine_service.py: {}", e.getMessage(), e);
        }
    }

    @PreDestroy
    public void stopEngineService() {
        if (engineProcess != null && engineProcess.isAlive()) {
            log.info("[EngineProcess] Stopping engine_service.py (PID: {})...", engineProcess.pid());

            engineProcess.destroy();

            try {
                boolean exited = engineProcess.waitFor(10, TimeUnit.SECONDS);
                if (!exited) {
                    log.warn("[EngineProcess] Engine did not stop gracefully, forcing...");
                    engineProcess.destroyForcibly();
                    engineProcess.waitFor(5, TimeUnit.SECONDS);
                }
                log.info("[EngineProcess] Engine service stopped");
            } catch (InterruptedException e) {
                log.warn("[EngineProcess] Interrupted while waiting for engine to stop");
                engineProcess.destroyForcibly();
                Thread.currentThread().interrupt();
            }
        }
    }
}
