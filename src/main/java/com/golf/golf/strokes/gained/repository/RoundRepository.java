package com.golf.golf.strokes.gained.repository;

import java.util.Optional;
import java.util.UUID;

import com.golf.golf.strokes.gained.entity.Round;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoundRepository extends JpaRepository<Round, Long> {

    // SELECT * FROM round WHERE client_id = ?
    // empty if this round was never uploaded; used to spot a retried upload
    Optional<Round> findByClientId(UUID clientId);
}
