package com.example.demo.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

public class InputSanitizer {

    /**
     * Tüm HTML/script taglarını, SQL anahtar kelimelerini ve
     * tehlikeli karakterleri temizler. Sadece düz metin döner.
     */
    public static String sanitize(String input) {
        if (input == null) return null;

        // 1) Tüm HTML taglarını ve JavaScript'i kaldır (Jsoup - no tags allowed)
        String cleaned = Jsoup.clean(input, Safelist.none());

        // 2) Null byte ve kontrol karakterlerini kaldır
        cleaned = cleaned.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "");

        // 3) SQL injection kalıplarını engelle (case-insensitive)
        //    JPA zaten parametric query kullanır; bu ek bir önlem
        String[] sqlPatterns = {
            "(?i)(--|;|/\\*|\\*/)",                          // SQL yorum/bitirme
            "(?i)\\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|UNION|SELECT|FROM|WHERE|OR|AND)\\b\\s*(TABLE|DATABASE|SCHEMA|INTO|FROM|\\*|--|;)" // SQL komutları
        };
        for (String pattern : sqlPatterns) {
            cleaned = cleaned.replaceAll(pattern, "");
        }

        // 4) Script/event içeren kalıpları kaldır (HTML encode sonrası kaçış denemeleri)
        cleaned = cleaned.replaceAll("(?i)(javascript|vbscript|data:|on\\w+\\s*=)", "");

        return cleaned.trim();
    }

    /**
     * Temizlenmiş metnin geçerli olup olmadığını kontrol eder.
     * Boş veya çok kısa yorumları reddeder.
     */
    public static boolean isValid(String sanitized, int minLen, int maxLen) {
        if (sanitized == null) return false;
        int len = sanitized.trim().length();
        return len >= minLen && len <= maxLen;
    }
}
