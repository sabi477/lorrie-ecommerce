package com.example.demo.controller;

import com.example.demo.entity.LoginHistory;
import com.example.demo.entity.User;
import com.example.demo.repository.LoginHistoryRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final LoginHistoryRepository loginHistoryRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/sellers")
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllSellers() {
        return userRepository.findByRole(User.Role.SELLER);
    }

    @GetMapping("/{id}/login-history")
    @PreAuthorize("hasRole('ADMIN')")
    public List<LoginHistory> getUserLoginHistory(@PathVariable Long id) {
        return loginHistoryRepository.findByUserIdOrderByLoginDateDesc(id);
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public User updateUserRole(@PathVariable Long id, @RequestParam User.Role role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(role);
        return userRepository.save(user);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setDeleted(true);
        userRepository.save(user);
    }
}
