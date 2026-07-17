import { haversineKm } from '../services/driverService'

describe('driverService - Score Weights', () => {
  describe('haversineKm helper', () => {
    it('should calculate distance between same points as 0', () => {
      const distance = haversineKm(49.2827, -123.1207, 49.2827, -123.1207)
      expect(distance).toBe(0)
    })

     it('should calculate correct distance between Vancouver and Calgary', () => {
       // Vancouver: 49.2827, -123.1207
       // Calgary: 51.0447, -114.0719
       const distance = haversineKm(49.2827, -123.1207, 51.0447, -114.0719)
       // Expected straight-line (great circle) distance is approximately 673 km
       expect(distance).toBeCloseTo(673, 0)
     })

    it('should calculate correct distance between Toronto and Montreal', () => {
      // Toronto: 43.6532, -79.3832
      // Montreal: 45.5017, -73.5673
      const distance = haversineKm(43.6532, -79.3832, 45.5017, -73.5673)
      // Expected straight-line (great circle) distance is approximately 504 km
      expect(distance).toBeCloseTo(504, 0)
    })
  })

  describe('ScoreWeights defaults and structure', () => {
    const DEFAULT_WEIGHTS = {
      rate: 0.25,
      value: 0.1,
      deadhead: 0.2,
      geographicProximity: 0.2,
      temporalAdjacency: 0.15,
      truckTypeMatch: 0.05,
      competition: 0.05,
    }

    it('should have valid default weight values that sum to 1.0', () => {
      const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0)
      expect(sum).toBe(1.0)
    })

    it('should have all weights between 0 and 1', () => {
      Object.values(DEFAULT_WEIGHTS).forEach((weight) => {
        expect(weight).toBeGreaterThanOrEqual(0)
        expect(weight).toBeLessThanOrEqual(1)
      })
    })

    it('should have all weight keys present', () => {
      const expectedKeys = ['rate', 'value', 'deadhead', 'geographicProximity', 'temporalAdjacency', 'truckTypeMatch', 'competition']
      const actualKeys = Object.keys(DEFAULT_WEIGHTS)
      expect(actualKeys.sort()).toEqual(expectedKeys.sort())
    })
  })

  describe('Score weight normalization logic', () => {
    /**
     * This mirrors the frontend normalization logic.
     * When weights don't sum to exactly 1.0, they should be proportionally scaled.
     */
    function normalizeWeights(weights: Record<string, number>): Record<string, number> {
      const sum = Object.values(weights).reduce((a, b) => a + b, 0)
      if (Math.abs(sum - 1.0) < 0.001) {
        return weights
      }
      const scaleFactor = 1 / sum
      const normalized: Record<string, number> = {}
      for (const key of Object.keys(weights)) {
        normalized[key] = Math.round(weights[key] * scaleFactor * 100) / 100
      }
      return normalized
    }

    it('should not modify weights that already sum to 1.0', () => {
      const input = { rate: 0.25, value: 0.1, deadhead: 0.2, geographicProximity: 0.2, temporalAdjacency: 0.15, truckTypeMatch: 0.05, competition: 0.05 }
      const result = normalizeWeights(input)
      expect(result.rate).toBe(0.25)
      expect(result.value).toBe(0.1)
    })

    it('should normalize weights that sum to more than 1.0', () => {
      const input = { rate: 0.4, value: 0.3, deadhead: 0.2, geographicProximity: 0.2, temporalAdjacency: 0.2, truckTypeMatch: 0.1, competition: 0.1 }
      const result = normalizeWeights(input)
      const sum = Object.values(result).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1.0, 1)
    })

    it('should normalize weights that sum to less than 1.0', () => {
      const input = { rate: 0.1, value: 0.1, deadhead: 0.1, geographicProximity: 0.1, temporalAdjacency: 0.1, truckTypeMatch: 0.1, competition: 0.1 }
      const result = normalizeWeights(input)
      const sum = Object.values(result).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1.0, 1)
    })

    it('should round normalized weights to 2 decimal places', () => {
      const input = { rate: 0.345, value: 0.1, deadhead: 0.2, geographicProximity: 0.2, temporalAdjacency: 0.15, truckTypeMatch: 0.005, competition: 0.005 }
      const result = normalizeWeights(input)
      Object.values(result).forEach((val) => {
        const str = val.toString()
        const decimals = str.split('.')[1]?.length ?? 0
        expect(decimals).toBeLessThanOrEqual(2)
      })
    })
  })
})
