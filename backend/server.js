
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// PROMISE-BASED MYSQL QUERY
function dbQuery(sql, values = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

// TEST BACKEND
app.get("/", (req, res) => {
    res.send("EquipTrack Backend is running!");
});

// TEST MYSQL CONNECTION
app.get("/test-db", (req, res) => {
    db.query("SELECT DATABASE() AS databaseName", (error, results) => {
        if (error) {
            return res.status(500).json({
                message: "Database connection error"
            });
        }

        res.json({
            message: "Successfully connected to EquipTrack MySQL!",
            database: results[0].databaseName
        });
    });
});

// REGISTER
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const cleanName = String(name || "").trim();
        const cleanEmail = String(email || "").trim().toLowerCase();

        if (!cleanName || !cleanEmail || !password || !role) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        if (!["student", "staff"].includes(role)) {
            return res.status(400).json({
                message: "Invalid account type."
            });
        }

        if (
            role === "student" &&
            !cleanEmail.endsWith("@g.batstate-u.edu.ph")
        ) {
            return res.status(400).json({
                message: "Students must use their official BatStateU student email."
            });
        }

        if (
            role === "staff" &&
            cleanEmail.endsWith("@g.batstate-u.edu.ph")
        ) {
            return res.status(400).json({
                message: "A student email cannot be used for a Staff account."
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        db.query(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, ?)`,
            [cleanName, cleanEmail, hashedPassword, role],
            (error, results) => {
                if (error) {
                    if (error.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "This email is already registered."
                        });
                    }

                    console.error("Registration error:", error.message);

                    return res.status(500).json({
                        message: "Unable to create account."
                    });
                }

                res.status(201).json({
                    message: "Account created successfully!",
                    userId: results.insertId
                });
            }
        );
    } catch (error) {
        console.error("Registration error:", error.message);

        res.status(500).json({
            message: "An unexpected error occurred."
        });
    }
});

// LOGIN
app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail || !password) {
        return res.status(400).json({
            message: "Please enter your email and password."
        });
    }

    db.query(
        "SELECT id, name, email, password, role FROM users WHERE email = ?",
        [cleanEmail],
        async (error, results) => {
            if (error) {
                console.error("Login error:", error.message);

                return res.status(500).json({
                    message: "Unable to log in."
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    message: "Invalid email or password."
                });
            }

            const user = results[0];

            try {
                const passwordMatches = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!passwordMatches) {
                    return res.status(401).json({
                        message: "Invalid email or password."
                    });
                }

                res.json({
                    message: "Login successful!",
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            } catch (compareError) {
                console.error(
                    "Password verification error:",
                    compareError.message
                );

                res.status(500).json({
                    message: "Unable to verify password."
                });
            }
        }
    );
});

// GET ALL EQUIPMENT
app.get("/api/equipment", (req, res) => {
    db.query(
        `SELECT id, name, description, quantity, available_quantity
         FROM equipment
         ORDER BY id`,
        (error, results) => {
            if (error) {
                console.error("Equipment fetch error:", error.message);

                return res.status(500).json({
                    message: "Unable to retrieve equipment."
                });
            }

            res.json(results);
        }
    );
});


// UPDATE EQUIPMENT AVAILABILITY
app.put("/api/equipment/:id/availability", (req, res) => {
    const equipmentId = Number(req.params.id);
    const availableQuantity = Number(req.body.available_quantity);

    if (
        !Number.isInteger(equipmentId) ||
        equipmentId <= 0 ||
        !Number.isInteger(availableQuantity) ||
        availableQuantity < 0
    ) {
        return res.status(400).json({
            message: "Invalid equipment ID or availability."
        });
    }

    db.query(
        "SELECT id FROM equipment WHERE id = ?",
        [equipmentId],
        (error, rows) => {
            if (error) {
                console.error("Equipment lookup error:", error.message);
                return res.status(500).json({
                    message: "Unable to find equipment."
                });
            }

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Equipment not found."
                });
            }

            db.query(
                `UPDATE equipment
                 SET available_quantity = ?
                 WHERE id = ?`,
                [availableQuantity, equipmentId],
                (updateError) => {
                    if (updateError) {
                        console.error("Equipment update error:", updateError.message);
                        return res.status(500).json({
                            message: "Unable to update equipment availability."
                        });
                    }

                    res.json({
                        message: "Equipment availability updated successfully!"
                    });
                }
            );
        }
    );
});


// SUBMIT BORROWING REQUEST
app.post("/api/borrowings", (req, res) => {
    const {
        user_id,
        equipment_id,
        borrow_date,
        return_date,
        block_section,
        purpose
    } = req.body;

    if (
        !user_id ||
        !equipment_id ||
        !borrow_date ||
        !return_date ||
        !block_section
    ) {
        return res.status(400).json({
            message: "Please complete all required borrowing fields."
        });
    }

    if (return_date < borrow_date) {
        return res.status(400).json({
            message: "Return date cannot be earlier than borrow date."
        });
    }

    const start = new Date(borrow_date + "T00:00:00");
    const end = new Date(return_date + "T00:00:00");
    const days = (end - start) / (1000 * 60 * 60 * 24);

    if (days > 7) {
        return res.status(400).json({
            message: "Borrowing period cannot exceed 7 days."
        });
    }

    // CHECK IF THE ACCOUNT IS A STUDENT
    db.query(
        "SELECT role FROM users WHERE id = ?",
        [user_id],
        (error, users) => {
            if (error) {
                console.error("User role check error:", error.message);

                return res.status(500).json({
                    message: "Unable to verify user account."
                });
            }

            if (users.length === 0 || users[0].role !== "student") {
                return res.status(403).json({
                    message: "Only student accounts can submit borrowing requests."
                });
            }

            // INSERT BORROWING REQUEST
            db.query(
                `INSERT INTO borrowings
                 (user_id, equipment_id, borrow_date, return_date,
                  block_section, purpose, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
                [
                    user_id,
                    equipment_id,
                    borrow_date,
                    return_date,
                    block_section.trim(),
                    purpose || ""
                ],
                (error, results) => {
                    if (error) {
                        console.error("Borrowing request error:", error.message);

                        return res.status(500).json({
                            message: "Unable to submit borrowing request."
                        });
                    }

                    res.status(201).json({
                        message: "Your borrowing request has been submitted!",
                        borrowingId: results.insertId
                    });
                }
            );
        }
    );
});

// GET ALL PENDING BORROWING REQUESTS
app.get("/api/borrowings/pending", (req, res) => {
    const sql = `
        SELECT
            borrowings.id,
            borrowings.user_id,
            borrowings.equipment_id,
            borrowings.quantity,
            borrowings.borrow_date,
            borrowings.return_date,
            borrowings.status,
            borrowings.block_section,
            borrowings.purpose,
            users.name AS student_name,
            users.email AS student_email,
            equipment.name AS equipment_name
        FROM borrowings
        INNER JOIN users
            ON borrowings.user_id = users.id
        INNER JOIN equipment
            ON borrowings.equipment_id = equipment.id
        WHERE borrowings.status = 'Pending'
       ORDER BY borrowings.id DESC
    `;

    db.query(sql, (error, results) => {
        if (error) {
            console.error("Pending requests error:", error.message);

            return res.status(500).json({
                message: "Unable to retrieve pending requests."
            });
        }

        res.json(results);
    });
});


// APPROVE BORROWING REQUEST
app.put("/api/borrowings/:id/approve", async (req, res) => {
    const borrowingId = Number(req.params.id);

    if (!Number.isInteger(borrowingId) || borrowingId <= 0) {
        return res.status(400).json({
            message: "Invalid borrowing request ID."
        });
    }

    try {
        await new Promise((resolve, reject) => {
            db.beginTransaction(error => {
                if (error) reject(error);
                else resolve();
            });
        });

        // GET THE BORROWING REQUEST
        const borrowingRows = await dbQuery(
            `SELECT id, user_id, equipment_id, quantity, status
             FROM borrowings
             WHERE id = ?
             FOR UPDATE`,
            [borrowingId]
        );

        if (borrowingRows.length === 0) {
            await new Promise(resolve => db.rollback(resolve));

            return res.status(404).json({
                message: "Borrowing request not found."
            });
        }

        const borrowing = borrowingRows[0];

        if (borrowing.status !== "Pending") {
            await new Promise(resolve => db.rollback(resolve));

            return res.status(400).json({
                message: "This request has already been processed."
            });
        }

        // CHECK EQUIPMENT AVAILABILITY
        const equipmentRows = await dbQuery(
            `SELECT id, available_quantity
             FROM equipment
             WHERE id = ?
             FOR UPDATE`,
            [borrowing.equipment_id]
        );

        if (equipmentRows.length === 0) {
            await new Promise(resolve => db.rollback(resolve));

            return res.status(404).json({
                message: "Equipment not found."
            });
        }

        const available = Number(equipmentRows[0].available_quantity);
        const requested = Number(borrowing.quantity);

        if (available < requested) {
            await new Promise(resolve => db.rollback(resolve));

            return res.status(400).json({
                message: "Not enough equipment available to approve this request."
            });
        }

        // DEDUCT AVAILABLE EQUIPMENT
        await dbQuery(
            `UPDATE equipment
             SET available_quantity = available_quantity - ?
             WHERE id = ?`,
            [requested, borrowing.equipment_id]
        );

        // UPDATE BORROWING STATUS
        await dbQuery(
            `UPDATE borrowings
             SET status = 'Approved'
             WHERE id = ?`,
            [borrowingId]
        );

        // CREATE STUDENT NOTIFICATION
        await dbQuery(
            `INSERT INTO notifications
             (user_id, borrowing_id, message, status)
             VALUES (?, ?, ?, 'Approved')`,
            [
                borrowing.user_id,
                borrowingId,
                "Your borrowing request has been approved!"
            ]
        );

        // SAVE ALL CHANGES
        await new Promise((resolve, reject) => {
            db.commit(error => {
                if (error) reject(error);
                else resolve();
            });
        });

        res.json({
            message: "Borrowing request approved successfully!"
        });

    } catch (error) {
        await new Promise(resolve => db.rollback(resolve));

        console.error("Approval error:", error.message);

        res.status(500).json({
            message: "Unable to approve borrowing request."
        });
    }
});



// DECLINE BORROWING REQUEST
app.put("/api/borrowings/:id/decline", async (req, res) => {
    const borrowingId = Number(req.params.id);

    if (!Number.isInteger(borrowingId) || borrowingId <= 0) {
        return res.status(400).json({
            message: "Invalid borrowing request ID."
        });
    }

    try {
        await new Promise((resolve, reject) => {
            db.beginTransaction(error => {
                if (error) reject(error);
                else resolve();
            });
        });

        // GET THE BORROWING REQUEST
        const rows = await dbQuery(
            `SELECT id, user_id, status
             FROM borrowings
             WHERE id = ?
             FOR UPDATE`,
            [borrowingId]
        );

        if (rows.length === 0) {
            await new Promise(resolve => db.rollback(resolve));

            return res.status(404).json({
                message: "Borrowing request not found."
            });
        }

        const borrowing = rows[0];

        if (borrowing.status !== "Pending") {
            await new Promise(resolve => db.rollback(resolve));

            return res.status(400).json({
                message: "This request has already been processed."
            });
        }

        // UPDATE BORROWING STATUS
        await dbQuery(
            `UPDATE borrowings
             SET status = 'Declined'
             WHERE id = ?`,
            [borrowingId]
        );

        // CREATE STUDENT NOTIFICATION
        await dbQuery(
            `INSERT INTO notifications
             (user_id, borrowing_id, message, status)
             VALUES (?, ?, ?, 'Declined')`,
            [
                borrowing.user_id,
                borrowingId,
                "Your borrowing request has been declined."
            ]
        );

        // SAVE ALL CHANGES
        await new Promise((resolve, reject) => {
            db.commit(error => {
                if (error) reject(error);
                else resolve();
            });
        });

        res.json({
            message: "Borrowing request declined and student notified."
        });

    } catch (error) {
        await new Promise(resolve => db.rollback(resolve));

        console.error("Decline error:", error.message);

        res.status(500).json({
            message: "Unable to decline borrowing request."
        });
    }
});


/* ==============================
   CONFIRM EQUIPMENT RETURN
============================== */

app.put("/api/borrowings/:id/return", async (req, res) => {
    const borrowingId = Number(req.params.id);

    if (!Number.isInteger(borrowingId) || borrowingId <= 0) {
        return res.status(400).json({
            message: "Invalid borrowing request ID."
        });
    }

    try {
        await new Promise((resolve, reject) => {
            db.beginTransaction(error => {
                if (error) reject(error);
                else resolve();
            });
        });

        // GET AND LOCK BORROWING REQUEST
        const borrowingRows = await dbQuery(
            `SELECT id, equipment_id, quantity, status
             FROM borrowings
             WHERE id = ?
             FOR UPDATE`,
            [borrowingId]
        );

        if (borrowingRows.length === 0) {
            await new Promise(resolve => db.rollback(resolve));

            return res.status(404).json({
                message: "Borrowing request not found."
            });
        }

        const borrowing = borrowingRows[0];

        if (borrowing.status !== "Approved") {
            await new Promise(resolve => db.rollback(resolve));

            return res.status(400).json({
                message: "This equipment is not awaiting return."
            });
        }

        // RESTORE EQUIPMENT AVAILABILITY
        await dbQuery(
            `UPDATE equipment
             SET available_quantity = available_quantity + ?
             WHERE id = ?`,
            [borrowing.quantity, borrowing.equipment_id]
        );

        // UPDATE BORROWING STATUS
        await dbQuery(
            `UPDATE borrowings
             SET status = 'Returned'
             WHERE id = ?`,
            [borrowingId]
        );

        await new Promise((resolve, reject) => {
            db.commit(error => {
                if (error) reject(error);
                else resolve();
            });
        });

        res.json({
            message: "Equipment returned successfully!"
        });

    } catch (error) {
        await new Promise(resolve => db.rollback(resolve));

        console.error("Equipment return error:", error.message);

        res.status(500).json({
            message: "Unable to confirm equipment return."
        });
    }
});


// GET BORROWING REQUESTS FOR A SPECIFIC STUDENT
app.get("/api/borrowings/user/:userId", (req, res) => {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid student ID."
        });
    }

    const sql = `
        SELECT
            borrowings.id,
            borrowings.user_id,
            borrowings.equipment_id,
            borrowings.quantity,
            borrowings.borrow_date,
            borrowings.return_date,
            borrowings.status,
            borrowings.block_section,
            borrowings.purpose,
            users.name AS student_name,
            users.email AS student_email,
            equipment.name AS equipment_name
        FROM borrowings
        LEFT JOIN users
            ON borrowings.user_id = users.id
        LEFT JOIN equipment
            ON borrowings.equipment_id = equipment.id
        WHERE borrowings.user_id = ?
        ORDER BY borrowings.created_at DESC
    `;

    db.query(sql, [userId], (error, results) => {
        if (error) {
            console.error("Student borrowings error:", error.message);

            return res.status(500).json({
                message: "Unable to retrieve your borrowing requests."
            });
        }

        res.json(results);
    });
});


// GET STAFF BORROWING HISTORY
app.get("/api/borrowings/history", (req, res) => {
    const sql = `
        SELECT
            borrowings.id,
            borrowings.user_id,
            borrowings.quantity,
            borrowings.borrow_date,
            borrowings.return_date,
            borrowings.status,
            borrowings.block_section,
            borrowings.purpose,
            users.name AS student_name,
            users.email AS student_email,
            equipment.name AS equipment_name
        FROM borrowings
        INNER JOIN users ON borrowings.user_id = users.id
        INNER JOIN equipment ON borrowings.equipment_id = equipment.id
        WHERE users.role = 'student'
        AND borrowings.status IN ('Approved', 'Declined', 'Returned')
    `;

    db.query(sql, (error, results) => {
        if (error) {
            console.error("Staff history error:", error.message);
            return res.status(500).json({
                message: "Unable to retrieve staff borrowing history."
            });
        }

        res.json(results);
    });
});


// SEND RETURN DEADLINE REMINDER TO STUDENT
app.post("/api/notifications/reminder/:borrowingId", (req, res) => {
    const borrowingId = Number(req.params.borrowingId);

    if (!Number.isInteger(borrowingId) || borrowingId <= 0) {
        return res.status(400).json({
            message: "Invalid borrowing request ID."
        });
    }

    const sql = `
        SELECT
            borrowings.id,
            borrowings.user_id,
            borrowings.return_date,
            borrowings.status,
            equipment.name AS equipment_name
        FROM borrowings
        INNER JOIN equipment
            ON borrowings.equipment_id = equipment.id
        WHERE borrowings.id = ?
    `;

    db.query(sql, [borrowingId], (error, results) => {
        if (error) {
            console.error("Reminder lookup error:", error.message);
            return res.status(500).json({
                message: "Unable to find borrowing request."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Borrowing request not found."
            });
        }

        const borrowing = results[0];

        if (borrowing.status !== "Approved") {
            return res.status(400).json({
                message: "Reminders can only be sent for approved borrowings."
            });
        }

        const returnDate = borrowing.return_date
            ? new Date(borrowing.return_date).toLocaleDateString("en-PH")
            : "the agreed return date";

        const message =
            `Reminder: Please return your borrowed ${borrowing.equipment_name} by ${returnDate}.`;

        const insertSql = `
            INSERT INTO notifications
                (user_id, borrowing_id, message, status)
            VALUES (?, ?, ?, 'Reminder')
        `;

        db.query(
            insertSql,
            [borrowing.user_id, borrowing.id, message],
            (insertError) => {
                if (insertError) {
                    console.error("Reminder insert error:", insertError.message);
                    return res.status(500).json({
                        message: "Unable to send reminder."
                    });
                }

                res.json({
                    message: "Return reminder sent successfully!"
                });
            }
        );
    });
});


// GET STUDENT NOTIFICATIONS
app.get("/api/notifications/user/:userId", (req, res) => {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid student ID."
        });
    }

    db.query(
        `SELECT id, user_id, borrowing_id, message, status,
                is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId],
        (error, results) => {
            if (error) {
                console.error("Student notifications error:", error.message);
                return res.status(500).json({
                    message: "Unable to retrieve notifications."
                });
            }

            res.json(results);
        }
    );
});


// MARK ONE NOTIFICATION AS READ
app.put("/api/notifications/:id/read", (req, res) => {
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({
            message: "Invalid notification ID."
        });
    }

    db.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE id = ?`,
        [notificationId],
        (error, results) => {
            if (error) {
                console.error("Mark notification read error:", error.message);
                return res.status(500).json({
                    message: "Unable to update notification."
                });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({
                    message: "Notification not found."
                });
            }

            res.json({
                message: "Notification marked as read."
            });
        }
    );
});


// MARK ALL STUDENT NOTIFICATIONS AS READ
app.put("/api/notifications/user/:userId/read", (req, res) => {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid student ID."
        });
    }

    db.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE user_id = ?`,
        [userId],
        (error) => {
            if (error) {
                console.error("Mark all notifications read error:", error.message);
                return res.status(500).json({
                    message: "Unable to update notifications."
                });
            }

            res.json({
                message: "All notifications marked as read."
            });
        }
    );
});


// START SERVER
console.log("UPDATED EQUIPTRACK SERVER IS RUNNING");

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`EquipTrack server running at http://localhost:${PORT}`);
});
