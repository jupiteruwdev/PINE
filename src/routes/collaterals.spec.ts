import request from 'supertest'
import app from '../app'

describe('routes /collaterals', () => {
  describe('GET /collaterals', () => {
    it('can get all Ethereum collaterals', async () => {
      const { body: res } = await request(app).get('/collaterals')
        .query({
          ethereum: 1,
          // owner:
        })
        .expect('Content-Type', /json/)
        .expect(200)

      console.log({ res })
    })
  })
})
