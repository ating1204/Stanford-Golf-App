package com.golf.golf.strokes.gained.repository;

import java.util.List;

import com.golf.golf.strokes.gained.entity.Hole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HoleRepository extends JpaRepository<Hole, Long> {

    // SELECT * FROM hole WHERE course_id = ? ORDER BY hole_number ASC
    // basically returns holes from specifc course 1-18 in order
    List<Hole> findByCourseIdOrderByHoleNumberAsc(Long courseId);
}