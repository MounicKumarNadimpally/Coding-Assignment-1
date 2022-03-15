const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format, isValid } = require("date-fns");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e}`);
    process.exit(1);
  }
};
initializeDBandServer();

// middleware

const validation = (request, response, next) => {
  let status = null;
  let priority = null;
  let category = null;
  let search_q = null;
  let dueDate = null;
  let date = null;
  if (Object.keys(request.body).length) {
    status = request.body.status;
    priority = request.body.priority;
    category = request.body.category;
    dueDate = request.body.dueDate;
    date = request.body.date;
  }
  if (Object.keys(request.query).length) {
    status = request.query.status;
    priority = request.query.priority;
    category = request.query.category;
    search_q = request.query.search_q;
    dueDate = request.query.dueDate;
    date = request.query.date;
  }
  let queryArray = [];
  if (status !== undefined) {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      queryArray.push(`status = '${status}'`);
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  }
  if (priority !== undefined) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      queryArray.push(`priority = '${priority}'`);
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  }
  if (category !== undefined) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      queryArray.push(`category = '${category}'`);
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  }
  if (search_q !== undefined) {
    queryArray.push(`todo LIKE '%${search_q}%'`);
  }
  if (dueDate !== undefined) {
    if (isValid(new Date(dueDate))) {
      const modDate = format(new Date(dueDate), "yyyy-MM-dd");
      request.body.dueDate = modDate;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
  if (date !== undefined) {
    if (isValid(new Date(date))) {
      const modDate = format(new Date(date), "yyyy-MM-dd");
      request.query.date = modDate;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }

  request.sendArray = queryArray;
  next();
};

// API 1

app.get("/todos", validation, async (request, response) => {
  const queryArray = request.sendArray;
  const mainQuery = queryArray.join(" AND ");
  const getQuery = `
  SELECT
  *
  FROM
  todo 
  where ${mainQuery};`;
  const result = await db.all(getQuery);
  let output = [];
  for (let item of result) {
    let object = {};
    object.id = item.id;
    object.todo = item.todo;
    object.priority = item.priority;
    object.category = item.category;
    object.status = item.status;
    object.dueDate = item.due_date;
    output.push(object);
  }
  response.send(output);
});

//API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  //   console.log(todoId);
  const getQuery = `
    SElECT
    *
    FROM
    todo
    WHERE
    id = ${todoId};`;
  const result = await db.get(getQuery);
  let object = {};
  object.id = result.id;
  object.todo = result.todo;
  object.priority = result.priority;
  object.status = result.status;
  object.category = result.category;
  object.dueDate = result.due_date;
  response.send(object);
});

//API 3

app.get("/agenda/", validation, async (request, response) => {
  const { date } = request.query;
  const getQuery = `
    SElECT
    *
    FROM
    todo
    WHERE
    due_date = '${date}';`;
  const result = await db.get(getQuery);
  let object = {};
  object.id = result.id;
  object.todo = result.todo;
  object.priority = result.priority;
  object.status = result.status;
  object.category = result.category;
  object.dueDate = result.due_date;
  response.send([object]);
});

// API 4

app.post("/todos/", validation, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postQuery = `
    INSERT INTO 
    todo (id,todo,priority,status,category,due_date)
    VALUES
    (
        ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${dueDate}'
    );
    `;
  await db.run(postQuery);
  response.send("Todo Successfully Added");
});

//API 5

app.put("/todos/:todoId/", validation, async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  if (status !== undefined) {
    const putQuery = `
            UPDATE
            todo
            SET
              status = '${status}'
            WHERE
              id = ${todoId};
            `;
    await db.run(putQuery);
    response.send("Status Updated");
  }
  if (priority !== undefined) {
    const putQuery = `
            UPDATE
            todo
            SET
             priority  = '${priority}'
            WHERE
              id = ${todoId};
            `;
    await db.run(putQuery);
    response.send("Priority Updated");
  }
  if (category !== undefined) {
    const putQuery = `
            UPDATE
            todo
            SET
             category  = '${category}'
            WHERE
              id = ${todoId};
            `;
    await db.run(putQuery);
    response.send("Category Updated");
  }
  if (todo !== undefined) {
    const putQuery = `
            UPDATE
            todo
            SET
             todo  = '${todo}'
            WHERE
              id = ${todoId};
            `;
    await db.run(putQuery);
    response.send("Todo Updated");
  }
  if (dueDate !== undefined) {
    const putQuery = `
            UPDATE
            todo
            SET
             due_date  = '${dueDate}'
            WHERE
              id = ${todoId};
            `;
    await db.run(putQuery);
    response.send("Due Date Updated");
  }
});

// API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const delQuery = `
    DELETE FROM todo WHERE id = '${todoId}';`;
  await db.run(delQuery);
  response.send("Todo Deleted");
});

module.exports = app;
