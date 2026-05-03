package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "login_history")
@Data
public class LoginHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String ip;

    @Column
    private String city;

    @Column(name = "login_date", nullable = false)
    private LocalDateTime loginDate = LocalDateTime.now();

    @Column(name = "is_risky", nullable = false)
    private boolean isRisky = false;

    @Column(name = "is_new_ip", nullable = false)
    private boolean isNewIp = false;
}
