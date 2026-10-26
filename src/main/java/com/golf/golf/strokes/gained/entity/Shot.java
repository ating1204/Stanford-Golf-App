package com.golf.golf.strokes.gained.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name = "shot")
public class Shot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long roundHoleId;
    private Integer shotNumber;
    private String club;
    // yards
    private Double startDist;
    private Double endDist;
    private String startLie;
    private String endLie;
    // GPS is optional: null = not recorded
    private Double startLat;
    private Double startLng;
    private Double endLat;
    private Double endLng;
    private Integer penalties;

    public Shot() {

    }

    public Shot(Long roundHoleId, Integer shotNumber, String club, Double startDist, Double endDist,
            String startLie, String endLie, Double startLat, Double startLng, Double endLat, Double endLng,
            Integer penalties) {
        this.roundHoleId = roundHoleId;
        this.shotNumber = shotNumber;
        this.club = club;
        this.startDist = startDist;
        this.endDist = endDist;
        this.startLie = startLie;
        this.endLie = endLie;
        this.startLat = startLat;
        this.startLng = startLng;
        this.endLat = endLat;
        this.endLng = endLng;
        // column is NOT NULL DEFAULT 0, but JPA sends null explicitly (skips the default), so default here
        this.penalties = penalties == null ? 0 : penalties;
    }

    public Long getId() {
        return id;
    }
    public Long getRoundHoleId() {
        return roundHoleId;
    }
    public Integer getShotNumber() {
        return shotNumber;
    }
    public String getClub() {
        return club;
    }
    public Double getStartDist() {
        return startDist;
    }
    public Double getEndDist() {
        return endDist;
    }
    public String getStartLie() {
        return startLie;
    }
    public String getEndLie() {
        return endLie;
    }
    public Double getStartLat() {
        return startLat;
    }
    public Double getStartLng() {
        return startLng;
    }
    public Double getEndLat() {
        return endLat;
    }
    public Double getEndLng() {
        return endLng;
    }
    public Integer getPenalties() {
        return penalties;
    }
}
