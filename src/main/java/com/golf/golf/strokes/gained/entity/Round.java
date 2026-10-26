package com.golf.golf.strokes.gained.entity;


import java.time.LocalDate;
import java.util.UUID;

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
    
    // made by the phone; same id on every retry of an upload
    // deals w/ communication prob btwn client and server
    private UUID clientId;

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
    public UUID getClientId() {
        return clientId;
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
    public Round(UUID clientId, Long courseId, String tee, LocalDate playedOn, String holes) {
        this.clientId = clientId;
        this.courseId = courseId;
        this.tee = tee;
        this.playedOn = playedOn;
        this.holes = holes;
    }
    
    


    





}
