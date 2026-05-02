package com.example.demo.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CartItemResponse {
    private Long productId;
    private String name;
    private String brand;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private String thumbnail;
    private String imageUrl;
    private Integer qty;
}
