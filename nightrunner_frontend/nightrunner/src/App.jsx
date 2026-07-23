import NOAImage from './assets/nightopadventures.jpg'

import './App.css'

function App() {

  return (
    <>
      <section>
        <img
            src={NOAImage}
            alt="Night Ops Adventures"
            style={{ maxWidth: '300px', width: '100%', height: 'auto' }}
        />
      </section>


      <body>
      <p>
        Welcome to Night Ops Adventures! This is a placeholder.
      </p>
      </body>
    </>
  )
}

export default App
