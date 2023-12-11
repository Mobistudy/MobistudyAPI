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

Finger tapping:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "tappingCount": 60
  }
```
TODO: we may add another metric that is clinically significative.

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

PO60:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "spo2": 92,
    "hr": 82
  }
```

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

TUGT:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z",
    "durationMs": 1200
  }
```


Vocalization:
```json
 "summary": {
    "startedTS": "2022-04-26T13:02:44.968Z",
    "completedTS": "2022-04-26T13:03:04.986Z"
    TBD
  }
```
