package com.example.demo.service;

import com.example.demo.dto.AuthResponse;
import com.example.demo.dto.ChangePasswordRequest;
import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.entity.LoginHistory;
import com.example.demo.entity.User;
import com.example.demo.repository.LoginHistoryRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final LoginHistoryRepository loginHistoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setRole(User.Role.CUSTOMER);

        user.setPhone(request.getPhone());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getRole().name(), user.getEmail(), user.getFullName(), user.getId(), user.getPhone());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isDeleted()) {
            throw new RuntimeException("Bu hesap silinmiştir. Giriş yapamazsınız.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        String ip = (request.getIp() != null && !request.getIp().isBlank()) ? request.getIp() : "unknown";
        String city = resolveCity(ip);

        boolean isNewIp = true;
        boolean isRisky = false;

        List<LoginHistory> history = loginHistoryRepository.findByUserIdOrderByLoginDateDesc(user.getId());
        if (!history.isEmpty()) {
            String lastIp = history.get(0).getIp();
            if (!lastIp.equals(ip) && !lastIp.equals("unknown")) {
                isNewIp = true;
                isRisky = true;
            } else {
                isNewIp = false;
                isRisky = false;
            }
        }

        LoginHistory loginRecord = new LoginHistory();
        loginRecord.setUser(user);
        loginRecord.setIp(ip);
        loginRecord.setCity(city);
        loginRecord.setLoginDate(LocalDateTime.now());
        loginRecord.setNewIp(isNewIp);
        loginRecord.setRisky(isRisky);
        loginHistoryRepository.save(loginRecord);

        user.setLastLoginIp(ip);
        user.setLastLoginCity(city);
        user.setLastLoginDate(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getRole().name(), user.getEmail(), user.getFullName(), user.getId(), user.getPhone());
    }

    private String resolveCity(String ip) {
        if (ip == null || ip.equals("unknown") || ip.equals("127.0.0.1") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
            return "Localhost";
        }
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("http://ip-api.com/json/" + ip + "?fields=city"))
                    .build();
            HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
            String body = res.body();
            int start = body.indexOf("\"city\":\"");
            if (start >= 0) {
                start += 8;
                int end = body.indexOf("\"", start);
                if (end > start) return body.substring(start, end);
            }
        } catch (IOException | InterruptedException ignored) {}
        return "Bilinmiyor";
    }

    public void changePassword(String userEmail, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}