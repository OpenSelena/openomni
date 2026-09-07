import React, {useEffect, useState} from 'react'
import {Text} from 'ink'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function Spinner({type}: {type?: string}) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % FRAMES.length)
    }, 80)
    return () => clearInterval(timer)
  }, [])

  return <Text>{FRAMES[frame]}</Text>
}

export default Spinner
