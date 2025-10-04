import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'

function Page() {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    async function getTodos() {
      const { data: todos } = await supabase.from('todos').select()

      if (todos && todos.length > 1) {
        setTodos(todos)
      }
    }

    getTodos()
  }, [])

  return (
    <div>
      <h1>Todos</h1>
      {todos.map((todo, index) => (
        <li key={index}>{JSON.stringify(todo)}</li>
      ))}
    </div>
  )
}
export default Page
