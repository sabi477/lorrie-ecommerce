package com.example.demo.dto;

import lombok.Data;

@Data
public class SavedPaymentRequest {
    private String cardHolderName;
    private String cardNumber;
    private String expiry;
    private boolean isDefault;
}
