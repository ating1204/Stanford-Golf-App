package com.golf.golf.strokes.gained.repository;

import java.util.List;

import com.golf.golf.strokes.gained.entity.Shot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShotRepository extends JpaRepository<Shot, Long> {

    // SELECT * FROM shot WHERE round_hole_id IN (...) ORDER BY shot_number
    // one query for every hole's shots, instead of one query per hole
    List<Shot> findByRoundHoleIdInOrderByShotNumberAsc(List<Long> roundHoleIds);
}
