package com.example.demo.dto;

import lombok.Data;

@Data
public class SavedAddressRequest {
    private String title;
    private String firstName;
    private String lastName;
    private String address;
    private String city;
    private String zip;
    private boolean isDefault;
}
