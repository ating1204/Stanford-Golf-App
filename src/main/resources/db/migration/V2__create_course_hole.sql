
/* e.g. stanford golf course | Stanford | CA */
CREATE TABLE course (
    id    bigserial PRIMARY KEY,
    name  text NOT NULL,
    city  text NOT NULL,
    state text NOT NULL
);
/* stores holes across all courses */
CREATE TABLE hole (
    id          bigserial PRIMARY KEY,
    /* statement defines a 64-bit integer foreign key column in a relational database 
    that cannot be empty and must point to a valid primary key in another table */
    course_id   bigint NOT NULL REFERENCES course(id), 
    hole_number int NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    par         int NOT NULL CHECK (par BETWEEN 3 AND 5),
    /* used to uniquely identify holes for each course (every hole from every course is stored here) */
    UNIQUE (course_id, hole_number)
);
