package com.golf.golf.strokes.gained.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Hole {
    /* fields */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long courseId;      
    private Integer holeNumber; 
    private Integer par;

    /* empty constructor */
    public Hole() {
    }

    /* getters */
    public Long getId() {
        return id;
    }

    public Long getCourseId() {
        return courseId;
    }

    public Integer getHoleNumber() {
        return holeNumber;
    }

    public Integer getPar() {
        return par;
    }
    
}