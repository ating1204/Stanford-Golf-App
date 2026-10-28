package com.golf.golf.strokes.gained.repository;

import java.util.List;

import com.golf.golf.strokes.gained.entity.RoundHole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoundHoleRepository extends JpaRepository<RoundHole, Long> {

    // SELECT * FROM round_hole WHERE round_id = ?
    List<RoundHole> findByRoundId(Long roundId);
}
