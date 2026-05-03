package com.example.demo.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final JdbcTemplate jdbcTemplate;

    private static final Set<String> BLOCKED_MUTATION_KEYWORDS = Set.of(
            "DROP", "DELETE", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE",
            "EXEC", "EXECUTE", "XP_", "SP_"
    );

    @PostMapping("/execute")
    public ResponseEntity<?> execute(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Query cannot be empty"));
        }

        // Only SELECT statements are allowed — defence-in-depth against DML
        String trimmed = query.stripLeading().toUpperCase();
        if (!trimmed.startsWith("SELECT")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only SELECT queries are permitted"));
        }

        try {
            return ResponseEntity.ok(jdbcTemplate.queryForList(query));
        } catch (DataAccessException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/mutate")
    public ResponseEntity<?> mutate(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Query cannot be empty"));
        }

        String trimmed = query.stripLeading().toUpperCase();

        // Only UPDATE and INSERT with RETURNING are allowed
        if (!trimmed.startsWith("UPDATE") && !trimmed.startsWith("INSERT")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only UPDATE and INSERT queries are permitted"));
        }

        // Block dangerous keywords regardless of position
        String upper = query.toUpperCase();
        for (String kw : BLOCKED_MUTATION_KEYWORDS) {
            if (upper.contains(kw)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden keyword detected: " + kw));
            }
        }

        try {
            // RETURNING clause makes UPDATE/INSERT behave like a query in PostgreSQL
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(query);
            return ResponseEntity.ok(rows);
        } catch (DataAccessException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
