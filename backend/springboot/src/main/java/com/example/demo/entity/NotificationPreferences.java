package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_preferences")
@Data
public class NotificationPreferences {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "order_updates")
    private Boolean orderUpdates = true;

    @Column
    private Boolean promotions = false;

    @Column(name = "new_arrivals")
    private Boolean newArrivals = true;

    @Column(name = "email_digest")
    private Boolean emailDigest = false;
}