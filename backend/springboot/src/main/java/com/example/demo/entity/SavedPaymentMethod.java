package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_payment_methods")
@Data
public class SavedPaymentMethod {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "card_holder_name", nullable = false)
    private String cardHolderName;

    @Column(name = "last_four", nullable = false, length = 4)
    private String lastFour;

    @Column(nullable = false, length = 10)
    private String brand;

    @Column(nullable = false, length = 5)
    private String expiry;

    @Column(name = "is_default")
    private boolean isDefault = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
