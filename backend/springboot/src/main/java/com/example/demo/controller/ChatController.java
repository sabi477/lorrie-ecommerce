package com.example.demo.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final JdbcTemplate jdbcTemplate;

    @PostMapping("/execute")
    public List<Map<String, Object>> execute(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        if (query == null || query.isEmpty()) {
            throw new IllegalArgumentException("Query cannot be empty");
        }
        return jdbcTemplate.queryForList(query);
    }
}
