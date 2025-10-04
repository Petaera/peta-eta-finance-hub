// import { useState, useEffect } from 'react'
// import { supabase } from '../integrations/supabase/client'

// function Todos() {
//   const [todos, setTodos] = useState([])

//   useEffect(() => {
//     async function getTodos() {
//       const { data: todos } = await supabase.from('todos').select()

//       if (todos && todos.length > 0) {
//         setTodos(todos)
//       }
//     }

//     getTodos()
//   }, [])

//   return (
//     <div className="mt-6 mb-6">
//       <header className="mb-4">
//         <h2 className="text-2xl font-bold">Todos</h2>
//       </header>
//       <div className="space-y-2">
//         {todos.length > 0 ? (
//           todos.map((todo, index) => (
//             <div key={index} className="p-3 bg-card rounded-lg border">
//               <li className="list-none">{JSON.stringify(todo)}</li>
//             </div>
//           ))
//         ) : (
//           <p className="text-muted-foreground">No todos found</p>
//         )}
//       </div>
//     </div>
//   )
// }

// export default Todos
