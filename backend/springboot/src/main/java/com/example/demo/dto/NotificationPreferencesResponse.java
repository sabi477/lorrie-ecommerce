package com.example.demo.dto;

import lombok.Data;

@Data
public class NotificationPreferencesResponse {
    private Boolean orderUpdates;
    private Boolean promotions;
    private Boolean newArrivals;
    private Boolean emailDigest;
}