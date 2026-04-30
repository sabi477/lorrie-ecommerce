package com.example.demo.controller;

import com.example.demo.entity.Shipment;
import com.example.demo.repository.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentRepository shipmentRepository;

    @GetMapping
    public List<Shipment> getAll() {
        return shipmentRepository.findAll();
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<Shipment> getByOrder(@PathVariable Long orderId) {
        return shipmentRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Shipment> create(@RequestBody Shipment shipment) {
        return ResponseEntity.ok(shipmentRepository.save(shipment));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Shipment> updateStatus(@PathVariable Long id,
            @RequestParam Shipment.ShipmentStatus status) {
        return shipmentRepository.findById(id).map(shipment -> {
            shipment.setStatus(status);
            return ResponseEntity.ok(shipmentRepository.save(shipment));
        }).orElse(ResponseEntity.notFound().build());
    }
}