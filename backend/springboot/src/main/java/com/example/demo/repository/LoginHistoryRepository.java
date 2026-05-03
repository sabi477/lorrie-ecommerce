package com.example.demo.repository;

import com.example.demo.entity.LoginHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LoginHistoryRepository extends JpaRepository<LoginHistory, Long> {
    List<LoginHistory> findByUserIdOrderByLoginDateDesc(Long userId);
}
