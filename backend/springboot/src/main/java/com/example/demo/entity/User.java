package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.CUSTOMER;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private boolean deleted = false;

    @Column(name = "last_login_ip")
    private String lastLoginIp;

    @Column(name = "last_login_city")
    private String lastLoginCity;

    @Column(name = "last_login_date")
    private LocalDateTime lastLoginDate;

    public enum Role {
        CUSTOMER, SELLER, ADMIN
    }
}