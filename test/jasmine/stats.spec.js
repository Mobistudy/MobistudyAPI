import * as stats from '../../src/services/stats.mjs'

let sampleData = [1, 2, 3, 2, 1, 3, 1, 2, 5, 4, 6]

let MEAN = 2.73
let VARIANCE = 2.82

describe('Testing stats', function () {
  it('mean is correct', function () {
    let mean = stats.mean(sampleData)
    expect(mean).toBeCloseTo(2.73)
  })

  it('variance is correct', function () {
    let variance = stats.variance(sampleData)
    expect(variance).toBeCloseTo(VARIANCE)
  })

  it('combined mean is correct', function () {
    let mean1 = stats.mean(sampleData.slice(0, 5))
    expect(mean1).toBeCloseTo(1.8)
    let mean2 = stats.mean(sampleData.slice(5, 11))
    expect(mean2).toBeCloseTo(3.5)

    let combinedMean = stats.combineMeans(mean1, 5, mean2, 6)
    expect(combinedMean).toBeCloseTo(MEAN)
  })

  it('combined stddev is correct', function () {
    let mean1 = stats.mean(sampleData.slice(0, 5))
    let mean2 = stats.mean(sampleData.slice(5, 11))
    let var1 = stats.variance(sampleData.slice(0, 5))
    let var2 = stats.variance(sampleData.slice(5, 11))

    let combinedVar = stats.combineVariances(mean1, var1, 5, mean2, var2, 6)
    expect(combinedVar).toBeCloseTo(VARIANCE)
  })
})


describe('Testing running stats', function () {
  it('running mean and variance are correct', function () {
    let runningStats = new stats.RollingStats()
    for (let i = 0; i < sampleData.length; i++) {
      runningStats.addValue(sampleData[i])
    }
    expect(runningStats.getMean()).toBeCloseTo(MEAN)
    expect(runningStats.getVariance()).toBeCloseTo(VARIANCE)
  })

})
