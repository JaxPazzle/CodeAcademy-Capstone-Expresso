const express = require("express");
const employeeRouter = express.Router();

const sqlite3 = require("sqlite3");
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

const bodyParser = require("body-parser");
employeeRouter.use(bodyParser.json());


//**************************
//  /api/employees Functions
//**************************

//*****
// GET
//*****
employeeRouter.get("/", (req, res, next) => {
  db.all("SELECT * FROM Employee WHERE is_current_employee = 1",
    (err, rows) => {
      if (err) {
        next(err);
      } else {
        //Returns a 200 response containing all saved currently-employed employees sepcified by is_current_employee
        res.status(200).json({ employees: rows });
      }
    }
  );
});
//*****
// POST
//*****
employeeRouter.post('/', validateEmployee, (req, res, next) => {
  const employeeInput = req.body.employee; //get employee from body
  db.run(`INSERT INTO Employee (name, position, wage)
  VALUES ($name, $position, $wage)`, {
    $name: employeeInput.name,
    $position: employeeInput.position,
    $wage: employeeInput.wage
  }, function (error) {
      if (error) {
        next(error);
      } else {
        db.get(`SELECT * FROM Employee
          WHERE id = ${this.lastID}`, (error, row) => {
            /*Creates a new employee with the information from the employee property of the request body 
            and saves it to the database. Returns a 201 response with the newly-created employee on the employee property of the response body*/
            res.status(201).send({ employee: row });
          });
      }
    });
});

//**************************************
//  /api/employees/:employeeId Functions
//**************************************

//*****
// GET
//*****
employeeRouter.get("/:employeeId", (req, res, next) => {
  //Returns a 200 response containing the employee with the supplied employee ID on the employee property of the response body
  res.status(200).json({ employee: req.employee });
});

//*****
// PUT
//*****
employeeRouter.put("/:employeeId", validateEmployee, (req, res, next) => {
  const employeeID = req.params.employeeId;
  const updateEmployee = req.body.employee;
  /*Updates the employee with the specified employee ID
   using the information from the employee property of the request body*/
  const sql = `UPDATE Employee SET name = '${
    updateEmployee.name
  }', position = '${updateEmployee.position}', wage = '${
    updateEmployee.wage
  }' WHERE id = ${employeeID}`;
  db.run(sql, err => {
    if (err) {
      next(error);
    }
     else {
      db.get(`SELECT * FROM Employee WHERE id = ${employeeID}`, (err, row) => {
        //Returns a 200 response with the updated employee on the employee property of the response body
        res.status(200).json({ employee: row });
      });
    }
  });
});
//*******
// DELETE
//*******
employeeRouter.delete("/:employeeId", (req, res, next) => {
  const employeeID = req.params.employeeId;
  //Updates the employee with the specified employee ID to be unemployed (is_current_employee equal to 0).
  const sql = `UPDATE Employee SET is_current_employee = 0 WHERE id = ${employeeID}`;
  db.run(sql, err => {
    if (err) {
      next(err);
    } else {
      db.get(`SELECT * FROM Employee WHERE id = ${employeeID}`, (err, row) => {
        res.status(200).json({ employee: row });
      });
    }
  });
});
//*************************************************
//   api/employees/:employeeId/timesheets Functions
//*************************************************

//*****
// GET
//*****
employeeRouter.get('/:employeeId/timesheets', (req, res, next) => {
  db.all(`SELECT * FROM Timesheet WHERE employee_id = ${req.employeeId}`, (error, rows) => {
    //Returns a 200 response containing the employee with the supplied employee ID on the employee property of the response body
    res.status(200).json({ timesheets: rows});
  });
});

//*****
// POST
//*****
employeeRouter.post('/:employeeId/timesheets', validateTimeSheet, (req, res, next) => {
  const timesheetInput = req.body.timesheet;
  /*Creates a new timesheet, related to the employee with the supplied employee ID, with the information from the timesheet property of the request body and saves it to the database*/
  db.run(`INSERT INTO Timesheet (hours, rate, date, employee_id)
  VALUES ($hours, $rate, $date, $employee_id)`, {
    $hours:timesheetInput.hours,
    $rate: timesheetInput.rate,
    $date: timesheetInput.date,
    $employee_id: req.employeeId
  }, function (error) {
    if (error) {
      next(error);
    }else{
      db.get(`SELECT * FROM Timesheet WHERE id = ${this.lastID}`, (error, row) => {
        //Returns a 201 response with the newly-created timesheet on the timesheet property of the response body
        res.status(201).send({ timesheet: row });
      });
    }
  });
});
//*************************************************
//  /api/employees/:employeeId/timesheets/:timesheetId Functions
//*************************************************

//*****
// PUT
//*****
employeeRouter.put('/:employeeId/timesheets/:timesheetId', validateTimeSheet, (req, res, next) => {
  const employeeID = req.params.employeeId;
  const updateTimesheet = req.body.timesheet;
  /*Updates the timesheet with the specified timesheet ID using the information from the timesheet property of the request body and saves it to the database*/
  const sql = `UPDATE Timesheet SET hours = ${updateTimesheet.hours}, rate = ${updateTimesheet.rate}, date = ${updateTimesheet.date}, employee_id = ${employeeID} WHERE id = ${req.timesheetId}`;
  db.run(sql, function(err) {
      if (err) {
          next(err);
      } else {
          db.get(`SELECT * FROM Timesheet WHERE id = ${req.timesheetId}`, (err, row) => {
            // Returns a 200 response with the updated timesheet on the timesheet property of the response body
              res.status(200).json({timesheet: row});
          });
      }
  });

});
//*******
// DELETE
//*******
employeeRouter.delete('/:employeeId/timesheets/:timesheetId', (req, res, next) => {
  const sql = `DELETE FROM Timesheet WHERE id = ${req.timesheetId}`;
  db.run(sql, (err) => {
      if (err) {
          next(err);
      } else {
        //Deletes the timesheet with the supplied timesheet ID from the database. Returns a 204 response.
          res.sendStatus(204);
      }
  });
});

//***************************
// Validation Helper Methods
//***************************
function validateEmployee(req, res, next) {
  const inputEmployee = req.body.employee;
  //If any required fields are missing, returns a 400 response
  if (!inputEmployee.name || !inputEmployee.position || !inputEmployee.wage) {
    return res.sendStatus(400);
  }
  next();
}
function validateTimeSheet(req, res, next) {
  const timesheet = req.body.timesheet;
  //If any required fields are missing, returns a 400 response
  if (!timesheet.hours || !timesheet.rate || !timesheet.date) {
    return res.sendStatus(400);
  }
  next();
}

//***********
// Parameters
//***********
employeeRouter.param('employeeId', (req, res, next, employeeId) => {
  db.get(`SELECT * FROM Employee WHERE id = ${employeeId}`, (error, row) => {
    if (error) {
      next(error);
    } else if (row === undefined) {
      //If an employee with the supplied employee ID doesn’t exist, returns a 404 response
      res.status(404).send('Employee not found!');
    } else {
      req.employee = row;
      req.employeeId = employeeId;
      next();
    }
  });
});

employeeRouter.param('timesheetId', (req, res, next, timesheetId) => {
  db.get( `SELECT * FROM Timesheet WHERE id = ${timesheetId}`, (error, row) => {
    if (error) {
      next(error);
    } else if (row === undefined) {
      //If an timesheet with the supplied timesheet ID doesn’t exist, returns a 404 response
      res.status(404).send('Timesheet not found!');
    } else {
      req.timesheet = row;
      req.timesheetId = timesheetId;
      next();
    }
  });
});

module.exports = employeeRouter;
