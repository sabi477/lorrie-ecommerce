package com.example.demo.dto;

import lombok.Data;

@Data
public class SavedPaymentResponse {
    private Long id;
    private String cardHolderName;
    private String lastFour;
    private String brand;
    private String expiry;
    private boolean isDefault;
}
