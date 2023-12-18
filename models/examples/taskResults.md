Example of summary produced by each type of test:


Answers to forms:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "answered": 18,
    "asked": 20
  }
```
The object may contain also additional elements, which are form-specific, an example here:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "answered": 18,
    "asked": 20,
    "symptomsScore": 45
  }
```
Hints for visualization: answered questions and any additional custom metric that may be present.


Data query:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "firstDate": "2022-04-01T00:00:00Z",
    "lastDate": "2022-04-01T00:00:00Z",
    "type": "steps",
    "length": 140
  }
```
first and last dates indicate the temporal period that the data covers.
The object may contain additional properties, depending on the data type, but this has not been defined yet.
Hints for visualization: dependent on case, hard to generalize


Drawing:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "totalVariabilitySquare": 10.2,
    "totalVariabilitySpiral": 2.9
  }
```
TODO: these summary data will be changed when we get to understand which metrics are more clinically relevant.
Hints for visualization: both variability indexes

Finger tapping:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "tappingCount": 60
  }
```
TODO: we may add another metric that is clinically significative.
Hints for visualization: count

Hold the phone:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "resting": {
      "left": {
        "startedTS": "2022-04-26T13:03:04.986Z",
        "completedTS": "2022-04-26T13:03:04.986Z",
        "accelerationVariance": 0.12,
        "orientationVariance": 12.9
      },
      "right": {
        "startedTS": "2022-04-26T13:03:04.986Z",
        "completedTS": "2022-04-26T13:03:04.986Z",
        "accelerationVariance": 0.12,
        "orientationVariance": 12.9
      }
    },
    "postural": {
      "left": {
        "startedTS": "2022-04-26T13:03:04.986Z",
        "completedTS": "2022-04-26T13:03:04.986Z",
        "accelerationVariance": 0.12,
        "orientationVariance": 12.9
      },
      "right": {
        "startedTS": "2022-04-26T13:03:04.986Z",
        "completedTS": "2022-04-26T13:03:04.986Z",
        "accelerationVariance": 0.12,
        "orientationVariance": 12.9
      }
    },
    "kinetic": {
      "left": {
        "startedTS": "2022-04-26T13:03:04.986Z",
        "completedTS": "2022-04-26T13:03:04.986Z",
        "accelerationVariance": 0.12,
        "orientationVariance": 12.9
      },
      "right": {
        "startedTS": "2022-04-26T13:03:04.986Z",
        "completedTS": "2022-04-26T13:03:04.986Z",
        "accelerationVariance": 0.12,
        "orientationVariance": 12.9
      }
    }
  }
```
TODO: variance will likely be substituted with another, more significative, metric
Hints for visualization: accel variance, for each hand, and each test (6 in total)

Miband3:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "length": 1032,
    "firstTS":  "2022-04-26T13:02:44.968Z",
    "lastTS":  "2022-04-26T13:02:44.968Z"
  }
```
TODO: it would be good to add daily statistics for hr, steps, activity etc.


Peakflow:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "pefMax": 532
  }
```
Hints for visualization: PEF max


PO60:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "spo2": 92,
    "hr": 82
  }
```
Hints for visualization: spo2 and HR


Position:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "location": "Malmo",
    "weather": "cloudy",
    "aqi": 8,
    "temperature": 17
  }
```
Hints for visualization: temperature and air quality (aqi)


SMWT:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "distance": 500,
    "borgScale": 6,
    "steps": 800
  }
```
Hints for visualization: distance


TUGT:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "durationMs": 1200
  }
```
Hints for visualization: duration


Vocalization:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "phases": [
      {
        "vocal": "a",
        "startedTS":  "2022-04-26T13:03:04.986Z",
        "completedTS": "2022-04-26T13:03:04.986Z",
        "filename": "1212312312.wav"
      },
       {
        "vocal": "i",
        "startedTS":  "2022-04-26T13:03:04.986Z",
        "completedTS": "2022-04-26T13:03:04.986Z",
        "filename": "1212312312.wav"
      },
       {
        "vocal": "u",
        "startedTS":  "2022-04-26T13:03:04.986Z",
        "completedTS": "2022-04-26T13:03:04.986Z",
        "filename": "1212312312.wav"
      }
    ]
  }
```
TODO: add the actual duration of the fonation, when algorithm available
Hints for visualization: for each vowel, the duration (end - start)
