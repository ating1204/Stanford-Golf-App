package com.golf.golf.strokes.gained.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.golf.golf.strokes.gained.entity.HoleTee;

public interface HoleTeeRepository extends JpaRepository<HoleTee, Long> {

    List<HoleTee> findByHoleIdIn(List<Long> holeIds);
    /* == SELECT ... FROM hole_tee WHERE hole_id IN (...) AND tee_name = teeName */
    /* true if any of these holes has this tee -> used to check a tee exists on a course */
    /* tees belong to holes, not courses, so pass in the course's hole ids */
    boolean existsByHoleIdInAndTeeName(List<Long> holeIds, String teeName);
}