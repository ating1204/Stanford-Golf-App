package com.golf.golf.strokes.gained.entity;


import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/* entity for one row of round */
@Entity 
@Table(name = "round")
public class Round {
    @Id 
    @GeneratedValue(strategy =  GenerationType.IDENTITY)
    private Long id;
    private Long courseId;
    private String tee;
    private Integer totalScore;
    private LocalDate playedOn;
    private String holes;

    /* empty constructor */
    public Round() {

    }
    /* getters */
    public Long getId() {
        return id;
    }
    public Long getCourseId() {
        return courseId;
    }
    public String getTee() {
        return tee;
    }
    public Integer getTotalScore() {
        return totalScore;
    }
    public LocalDate getPlayedOn() {
        return playedOn;
    }
    public String getHoles() {
        return holes;
    }
    /* setters */
    public void setTee(String tee) {
        this.tee = tee;
    }
    public void setTotalScore(Integer totalScore) {
        this.totalScore = totalScore;
    }
    public void setHoles(String holes) {
        this.holes = holes;
    }
    public Round(Long courseId, String tee, LocalDate playedOn, String holes) {
        this.courseId = courseId;
        this.tee = tee;
        this.playedOn = playedOn;
        this.holes = holes;
    }
    
    


    





}
