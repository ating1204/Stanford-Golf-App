package com.golf.golf.strokes.gained.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name = "round_hole")
public class RoundHole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long roundId;
    private Long holeId;
    private Integer score;
    private String gir;
    private String fairway;
    private Integer putts;
    private Integer chips;
    private Integer sandShots;
    private Integer penalties;

    /* empty constructor */
    public RoundHole() {

    }

    /* creation constructor: everything is known at upload, except the id (db makes it) */
    public RoundHole(Long roundId, Long holeId, Integer score, String gir, String fairway,
            Integer putts, Integer chips, Integer sandShots, Integer penalties) {
        this.roundId = roundId;
        this.holeId = holeId;
        this.score = score;
        this.gir = gir;
        this.fairway = fairway;
        this.putts = putts;
        this.chips = chips;
        this.sandShots = sandShots;
        this.penalties = penalties;
    }

    /* getters */
    public Long getId() {
        return id;
    }
    public Long getRoundId() {
        return roundId;
    }
    public Long getHoleId() {
        return holeId;
    }
    public Integer getScore() {
        return score;
    }
    public String getGir() {
        return gir;
    }
    public String getFairway() {
        return fairway;
    }
    public Integer getPutts() {
        return putts;
    }
    public Integer getChips() {
        return chips;
    }
    public Integer getSandShots() {
        return sandShots;
    }
    public Integer getPenalties() {
        return penalties;
    }
}
