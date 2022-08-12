afterEach(function() {
  if (this.currentTest?.state !== 'failed') return
  console.error(this.currentTest?.err)
})
