const express = require('express');
const menuRouter = express.Router();

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

const bodyParser = require('body-parser');
menuRouter.use(bodyParser.json());



//*******************************
// /api/menus Functions
//*******************************

//*****
// GET
//*****
menuRouter.get('/', (req, res, next) => {
    db.all('SELECT * FROM Menu',
      (err, rows) => {
        if (err) {
          next(err);
        } else { 
        //Returns a 200 response containing all saved menus on the menus property of the response body
          res.status(200).json({menus: rows});
        }
      });
  });
//*****
// POST
//*****
menuRouter.post('/', validateMenu, (req, res, next) => {
    const inputMenu = req.body.menu;
    db.run(`INSERT INTO Menu (title) VALUES ('${inputMenu.title}')`,
        function(err) {
            if (err){
                next(error);
            }
            db.get(`Select * from Menu where id = ${this.lastID}`, (err, row) => {
                if (!row) {
                    return res.sendStatus(500);
                }else{
                /*Creates a new menu with the information from the menu property of the request body 
                and saves it to the database. Returns a 201 response with the newly-created menu on the menu property of the response body*/
                res.status(201).send({menu: row});
                }
            });
    });
});
//*******************************
// /api/menus/:menuId  Functions
//*******************************
menuRouter.get('/:id', (req, res, next) => {
    //Returns a 200 response containing the menu with the supplied menu ID on the menu property of the response body
    res.status(200).json({menu: req.menu});
});  

//****
// PUT
//****
menuRouter.put('/:id', validateMenu, (req, res, next) => {
    const menuID = req.menu.id;
    const updateMenu = req.body.menu;
    const sql = `UPDATE Menu SET title = '${updateMenu.title}' WHERE id = ${menuID}`;
    db.run(sql, (err) => {
        if (err){
           next(err);
        } else {
            db.get(`SELECT * FROM Menu WHERE id = ${menuID}`, (err, row) => {
                if (!row){
                    return res.sendStatus(500);
                }else{
                  /*Updates the menu with the specified menu ID using the information from the menu 
                  property of the request body and saves it to the database. Returns a 200 response with the updated menu on the menu property of the response body*/
                  res.status(200).json({menu: row});
                }
            })
        }
    });
});
//*******
// DELETE
//*******
menuRouter.delete('/:id', (req, res, next) => {
    const menuID = req.menu.id;
    const checksql = `SELECT * from MenuItem WHERE menu_id = ${menuID}`;
    const deletesql = `DELETE FROM Menu WHERE id = ${menuID}`;
    db.get(checksql, (err, row) => {
        if (err) {
            next(err);
        } else if (row) {
            //If the menu with the supplied menu ID has related menu items, returns a 400 response.
            res.sendStatus(400);
        } else {
            db.run(deletesql, (err) => {
                if (err) {
                    next(err);
                } else {
                    /*Deletes the menu with the supplied menu ID from the database if that menu has no related menu items. Returns a 204 response.*/
                    res.sendStatus(204);
                }
            });
        }
    });
});
//****************************************
// /api/menus/:menuId/menu-items Functions
//****************************************
menuRouter.get('/:id/menu-items', (req, res, next) => {
    const menuID = req.menu.id;
    db.all(`SELECT * FROM MenuItem WHERE menu_id = ${menuID}`, (error, rows) => {
      if (error) {
        console.log(error);
      } else {
          /*Returns a 200 response containing all saved menu items related to the menu with the supplied menu ID on the menuItems property of the response body*/
        res.status(200).send({ menuItems: rows });
      }
    });
  });
//*****
// POST
//*****
menuRouter.post('/:id/menu-items',validateMenuItem, (req, res, next) => {
    const menuItemInput = req.body.menuItem;
    db.run(`INSERT INTO MenuItem (name, description, inventory, price, menu_id) VALUES ($name, $description, $inventory, $price, $menu_id)`, {
      $name: menuItemInput.name,
      $description: menuItemInput.description || '',
      $inventory: menuItemInput.inventory,
      $price: menuItemInput.price,
      $menu_id: req.menu.id
    }, function (error) {
        if (error) {
          next(error);
        } else {
          db.get(`SELECT * FROM MenuItem
            WHERE id = ${this.lastID}`, (error, row) => {
                /*Creates a new menu item, related to the menu with the supplied menu ID, with the information from the menuItem 
                property of the request body and saves it to the database. Returns a 201 response with the newly-created menu item on the menuItem 
                property of the response body*/
              res.status(201).send({ menuItem: row });
            });
        }
      });
  });

//****************************************************
// /api/menus/:menuId/menu-items/:menuItemId Functions
//****************************************************

//****
// PUT
//****
menuRouter.put('/:id/menu-items/:menuItemId', validateMenuItem, (req, res, next) => {
    const updateMenuItem = req.body.menuItem;
    const menuId = req.menu.id;
    const qs = `UPDATE MenuItem SET name = '${updateMenuItem.name}', description = '${updateMenuItem.description}', inventory = ${updateMenuItem.inventory}, price = ${updateMenuItem.price}, menu_id = ${menuId} WHERE id = ${req.menuItemId}`;
    db.run(qs, function(err) {
        if (err) {
            next(err);
        } else {
            db.get(`SELECT * FROM MenuItem WHERE id = ${req.menuItemId}`, (err, row) => {
                /*Updates the menu item with the specified menu item ID using the information from the menuItem property of the request body and 
                saves it to the database. Returns a 200 response with the updated menu item on the menuItem property of the response body*/
                res.status(200).json({menuItem: row});
            });
        }
    });

});
//*******
// DELETE
//*******
menuRouter.delete('/:id/menu-items/:menuItemId', (req, res, next) => {
    const qs = `DELETE FROM MenuItem WHERE id = ${req.menuItemId}`;
    db.run(qs, (err) => {
        if (err) {
            next(err);
        } else {
            //Deletes the menu item with the supplied menu item ID from the database. Returns a 204 response.
            res.sendStatus(204);
        }
    });
});


//***************************
// Validation Helper Methods
//***************************
function validateMenu (req, res, next){
    const inputMenu = req.body.menu;
    if (!inputMenu.title) {
        //If any required fields are missing, returns a 400 response
        return res.sendStatus(400);
    }
    next();
}
function validateMenuItem (req, res, next){
    const inputMenuItem = req.body.menuItem;
    const menuId = req.menu.id;
    if (!inputMenuItem.name || !inputMenuItem.inventory || !inputMenuItem.price || !menuId) {
        //If any required fields are missing, returns a 400 response
        return res.sendStatus(400);
    }
    next();
}
//***********
// Parameters
//***********
menuRouter.param('id', (req, res, next, id) => {
    db.get(`SELECT * FROM Menu WHERE id = ${id}`, (error, row) => {
      if (error) {
        next(error);
      } else if (row === undefined) {
        //If a menu with the supplied menu ID doesn’t exist, returns a 404 response
        res.status(404).send('Menu not found!');
      } else {
        req.menu = row;
        next();
      }
    });
  });
  menuRouter.param('menuItemId', (req, res, next, id) => {
    db.get(`SELECT * FROM MenuItem WHERE id = ${id}`, (error, row) => {
      if (error) {
        next(error);
      } else if (row === undefined) {
        //If a menu item with the supplied menu item ID doesn’t exist, returns a 404 response
        res.status(404).send('Menu item not found!');
      } else {
        req.menuItemId = id;
        next();
      }
    });
  });

module.exports = menuRouter;
