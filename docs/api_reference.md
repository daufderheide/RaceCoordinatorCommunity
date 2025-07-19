# Race Coordinator API – Markdown Documentation with Examples

This document provides complete and clarified Markdown documentation for the Race Coordinator (RC) REST API, starting from page 10 of the original PDF. All key endpoints are explained and demonstrated with real curl examples and annotated response breakdowns. Visual examples are included for clarity.

⸻

## Table of Contents
	•	Endpoint q=1 – Track and Lane Configuration
	•	Endpoint q=2 – Race Overview and Driver Assignments
	•	Endpoint q=4 – Race Status and Countdown Timer
	•	Endpoint q=8 – Heat Results Summary
	•	Endpoint q=16 – Realtime Driver Stats
	•	Endpoint q=32 – Driver Lap Details with Segment Times

⸻

### Endpoint q=1 – Track and Lane Configuration

Sample Request

curl "http://localhost:8080/api?q=1&tid=m0"

Sample Response
```
{
  "tid": "m0",
  "r": [
    {
      "q": 1,
      "n": "DG Espanha",
      "l": [
        {"c": "Red", "fc": "Black", "l": 66},
        {"c": "White", "fc": "Black", "l": 66},
        {"c": "Green", "fc": "White", "l": 66},
        {"c": "Orange", "fc": "Black", "l": 66},
        {"c": "#0080FF", "fc": "White", "l": 66},
        {"c": "Yellow", "fc": "Black", "l": 66},
        {"c": "Purple", "fc": "White", "l": 66},
        {"c": "Black", "fc": "White", "l": 66}
      ]
    }
  ]
}

Field Descriptions
	•	q: query ID (always 1)
	•	n: track name
	•	l[]: list of lanes:
	•	c: lane color
	•	fc: font color for UI display
	•	l: number of laps required (or track section count)
```
⸻

### Endpoint q=2 – Race Overview and Driver Assignments

Sample Request

curl "http://localhost:8080/api?q=2&tid=m0"

Sample Response

See full example in previous message.
```
Field Highlights
	•	rlt: last recorded lap time (driver, time, date)
	•	rs: race summary / status
	•	blt: best lap time
	•	d[]: array of drivers with assigned heats and driver IDs
```
⸻

### Endpoint q=4 – Race Status and Countdown Timer

Sample Request

curl "http://localhost:8080/api?q=4&tid=m0"

Response Examples
```
Status: Starting

{"tid":"m0", "r":[{"q":4,"s":2,"sname":"Starting","hn":1,"cnt":8,"t":3}]}

Status: Running

{"tid":"m0", "r":[{"q":4,"s":4,"sname":"Racing","hn":0,"cnt":8,"t":32.51}]}

Status: Heat Over

{"tid":"m0", "r":[{"q":4,"s":6,"sname":"Heat Over","hn":0,"cnt":8,"t":0}]}

Field Descriptions
	•	s: numeric status code
	•	sname: text status (e.g., Racing, Starting)
	•	hn: current heat number (0-indexed)
	•	cnt: total heats
	•	t: remaining time
```
⸻

### Endpoint q=8 – Heat Results Summary

Sample Request

curl "http://localhost:8080/api?q=8&tid=m0"

Response (abbreviated)
```
{
  "tid": "m0",
  "r": [
    {
      "q": 8,
      "d": [
        {"n": "PAIN Team", "v": 25, "blt": 7.733, "a": 9.065, "g": -8.914, "gp": -8.914},
        ...
      ]
    }
  ]
}

Field Notes
	•	v: total laps
	•	blt: best lap time
	•	a: average lap
	•	g: gap to leader
	•	gp: gap to previous
```
⸻

### Endpoint q=16 – Realtime Driver Stats

Sample Request

curl "http://localhost:8080/api?q=16&tid=m0"

Response (abbreviated)
```
{
  "tid": "m0",
  "r": [
    {
      "q": 16,
      "d": [
        {
          "n": "PAIN Team",
          "l": 2,
          "lt": 9.37,
          "sts": [2.828, 3.764, 2.778, 0],
          "blt": 8.756,
          "a": 9.063,
          "g": 1.014,
          "p": 3
        },
        ...
      ]
    }
  ]
}

Key Fields
	•	l: current lap
	•	lt: current lap time
	•	sts: segment times
	•	blt: best lap time
	•	a: average
	•	g: gap
	•	p: position
```
⸻

### Endpoint q=32 – Driver Lap Details with Segment Times

Sample Request

curl "http://localhost:8080/api?q=32&tid=m0&did[]=32:85:86:87:88:89:90:91:92:93&hn=-1&ln=0&l=0"

Sample Response (per driver)
```
{
  "tid": "m0",
  "r": [
    {
      "q": 32,
      "did": 94,
      "l": [
        {"abs": 10.794, "lt": 10.794, "sts": [3.873, 3.304, 3.364, 0], "p": 7},
        {"abs": 19.637, "lt": 8.843, "sts": [2.366, 3.122, 3.355, 0], "p": 5}
      ]
    }
  ]
}

Field Breakdown
	•	abs: absolute timestamp (s)
	•	lt: lap time (s)
	•	sts: segment times (usually 4 values, last is 0 if unused)
	•	p: lap position

Notes
	•	You must include did[] formatted as 32:ID1:ID2...
	•	Endpoint can be used independently
	•	Ideal for telemetry and historical lap analysis
```
⸻

# 📌 Changelog
```
Version             Date                Author              Description

1.0                 2025-06-03          gersonfer           Initial conversion from PDF to Markdown;
                                                            focused only on API (pages 10-59) of readme.pdf .

1.1                 2025-06-03          gersonfer           Corrected q=32 documentation (syntax, param did[],
                                                            added curl example).

1.2                 2025-06-03          gersonfer           Added field breakdowns and full explanations
                                                            for endpoints q=1, 2, 4, 8, 16, 32 .

1.3                 2025-06-03          gersonfer           Included inline example for parameter explanation
                                                            and typical responses.

1.4                 (optional)          gersonfer           Future updates or community contributions.            
```
