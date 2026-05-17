package com.example.backend_medstock;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class QueryRunner {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-eu-west-3.pooler.supabase.com:5432/postgres";
        String user = "postgres.fqygmtajeugelxmycenl";
        String pass = "kronsoft-medistock";
        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            try (Statement stmt = conn.createStatement()) {

                System.out.println("=== DISTINCT ROLES ===");
                try (ResultSet rs = stmt.executeQuery("SELECT DISTINCT role FROM public.app_users")) {
                    while (rs.next()) {
                        System.out.println("  Role: " + rs.getString(1));
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
