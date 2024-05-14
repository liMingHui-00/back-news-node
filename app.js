const express = require("express")
const bodyParser = require("body-parser")
const mysql = require("mysql")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const app = express()
app.use(bodyParser.json())
app.use("/public", express.static("public"))
app.use(
  cors({
    origin: "*",
  })
)
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "news",
})
app.post("/register", (req, res) => {
  // 从请求体中获取用户名、电子邮件和密码
  const { username, email, password } = req.body
  const user = {
    username: username,
    email: email,
    password: password,
    avatar: "http://localhost:5173/src/assets/avatar.png",
  }
  const query = "INSERT INTO users SET ?"
  // 将用户信息插入到数据库中
  connection.query(query, user, (error, results) => {
    if (error) {
      // 注册失败
      res.status(500).send("Error in registration")
    } else {
      // 成功返回成功信息
      res.status(200).send("Registration successful")
    }
  })
})

// app.post("/login", (req, res) => {
//   // 根据用户名查询用户信息，不直接查询密码
//   const query = "SELECT * FROM users WHERE username = ?"
//   connection.query(query, [req.body.username], (error, results) => {
//     if (error) {
//       // 查询失败
//       res.status(500).send("Server error")
//     } else if (results.length === 0) {
//       // 用户不存在
//       res.status(401).send("Invalid username or password")
//     } else {
//       // 用户存在，验证密码
//       const user = results[0]
//       // 使用bcrypt比较提交的密码和数据库中的加密密码
//       bcrypt.compare(req.body.password, user.password, (err, isMatch) => {
//         if (err) {
//           // bcrypt处理错误
//           res.status(500).send("Authentication failed")
//         } else if (!isMatch) {
//           // 密码不匹配
//           res.status(401).send("Invalid username or password")
//         } else {
//           // 密码匹配，生成token
//           const token = jwt.sign({ id: user.id }, "your_secret_key", {
//             expiresIn: "1h",
//           })
//           res.status(200).json({ token: token })
//         }
//       })
//     }
//   })
// })
app.post("/login", (req, res) => {
  // 根据用户名查询用户信息，不再查询密码
  const query = "SELECT * FROM users WHERE username = ?"
  connection.query(query, [req.body.username], (error, results) => {
    if (error) {
      // 查询失败
      res.status(500).send("Server error")
    } else if (results.length === 0) {
      // 用户不存在
      res.status(401).send("Invalid username or password")
    } else {
      // 用户存在，直接比较密码明文
      const user = results[0]
      if (req.body.password !== user.password) {
        // 密码不匹配
        res.status(401).send("Invalid username or password")
      } else {
        // 密码匹配，生成token
        const token = jwt.sign({ id: user.id }, "your_secret_key", {
          expiresIn: "1h",
        })
        res.status(200).json({ token: token })
      }
    }
  })
})

// 所有的新闻
app.get("/news", (req, res) => {
  const query = "SELECT * FROM news"
  connection.query(query, (error, results) => {
    if (error) {
      res.status(500).send("Error fetching users")
    } else {
      res.status(200).json(results)
    }
  })
})

// 获取特定新闻的详情
app.get("/news/:id", (req, res) => {
  const newsId = req.params.id // 从 URL 参数中获取新闻 ID
  const query = "SELECT * FROM news WHERE id = ?"
  connection.query(query, [newsId], (error, results) => {
    if (error) {
      res.status(500).send("Error fetching news detail")
    } else {
      if (results.length > 0) {
        res.status(200).json(results[0]) // 发送第一条匹配的新闻
      } else {
        res.status(404).send("News not found")
      }
    }
  })
})

// 通过按钮将新闻设置为点赞
// coid 1 是点赞
app.post("/setlikenews", (req, res) => {
  const query = "UPDATE news SET coid = 1 WHERE id = ?"
  const { newsid } = req.body
  connection.query(query, [newsid], (error, results) => {
    if (error) throw error
    res.send({ message: "点赞成功", affectedRows: results.affectedRows })
  })
})
// 通过按钮将新闻设置为收藏
// coid 2 是收藏
app.post("/setfavoritenews", (req, res) => {
  const query = "UPDATE news SET coid = 2 WHERE id = ?"
  const { newsid } = req.body
  connection.query(query, [newsid], (error, results) => {
    if (error) throw error
    res.send({ message: "收藏成功", affectedRows: results.affectedRows })
  })
})

// 把设置作者为关注
app.post("/setLikeAuthor", (req, res) => {
  const { newsid } = req.body
  // 首先，查询需要更新的记录的author
  const queryAuthor = `SELECT author FROM news WHERE id = ?`
  connection.query(queryAuthor, [newsid], (error, results) => {
    if (error) {
      throw error
    }
    if (results.length > 0) {
      const author = results[0].author
      // 然后，基于author更新所有记录的likeAuthor
      const updateQuery = `UPDATE news SET likeAuthor = 1 WHERE author = ?`
      connection.query(updateQuery, [author], (updateError, updateResults) => {
        if (updateError) {
          throw updateError
        }
        res.send({
          message: "关注成功",
          affectedRows: updateResults.affectedRows,
        })
      })
    } else {
      res.send({ message: "未找到指定的新闻ID" })
    }
  })
})

// 取消作者的关注
app.post("/removeLikeAuthor", (req, res) => {
  const { newsid } = req.body
  // 首先，根据id查询新闻的author
  const queryAuthor = "SELECT author FROM news WHERE id = ?"
  connection.query(queryAuthor, [newsid], (error, results) => {
    if (error) {
      throw error
    }
    // 确保查询到了新闻记录
    if (results.length > 0) {
      const author = results[0].author
      // 然后，根据author取消所有新闻的关注
      const updateQuery = "UPDATE news SET likeAuthor = 0 WHERE author = ?"
      connection.query(updateQuery, [author], (updateError, updateResults) => {
        if (updateError) {
          throw updateError
        }
        // 使用`res.json`而不是`res.send`更合适，更易于处理JSON响应
        res.json({
          message: "取消关注成功",
          affectedRows: updateResults.affectedRows,
        })
      })
    } else {
      res.json({
        message: "没有找到指定新闻id",
      })
    }
  })
})

// 推荐的新闻
app.get("/recommend", (req, res) => {
  //                                                    1   是已关注
  const query = "select * from news where likeAuthor = 1"
  connection.query(query, (error, results) => {
    if (error) {
      console.error(error)
      res.status(500).send("Error in obtaining recommended news")
    } else {
      res.status(200).json(results)
    }
  })
})

// 点击搜索新闻
app.get("/search", (req, res) => {
  const searchmsg = req.query.searchmsg
  const query = "SELECT * FROM news WHERE title LIKE ?"
  // 模糊查询，在SQL查询中使用LIKE操作符，并且在searchmsg的两边加上百分号（%）。这样做可以匹配任何在title字段中包含searchmsg文本的记录。
  connection.query(query, [`%${searchmsg}%`], (error, results) => {
    if (error) {
      res.status(500).send("没有该新闻")
    } else {
      if (results.length > 0) {
        res.status(200).json(results)
      } else {
        res.status(404).send("没有该新闻")
      }
    }
  })
})

// 热点新闻
app.get("/hot", (req, res) => {
  const query = "SELECT * FROM news order by rand() LIMIT 15 "
  connection.query(query, (error, results) => {
    if (error) {
      res.status(500).send("Error fetching users")
    } else {
      res.status(200).json(results)
    }
  })
})

// 首页的新闻
app.get("/homenews", (req, res) => {
  const query = "SELECT * FROM news WHERE type = '头条' LIMIT 20 "
  connection.query(query, (error, results) => {
    if (error) {
      res.status(500).send("Error fetching news detail")
    } else {
      res.status(200).json(results)
    }
  })
})

// 排行榜
app.get("/ranklist", (req, res) => {
  const query = "SELECT * FROM news  LIMIT 10 "
  connection.query(query, (error, results) => {
    if (error) {
      res.status(500).send("Error fetching users")
    } else {
      res.status(200).json(results)
    }
  })
})
// 更新排行榜
app.get("/updatelist", (req, res) => {
  const query = "SELECT * FROM news ORDER BY RAND() LIMIT 10 "
  connection.query(query, (error, results) => {
    if (error) {
      res.status(500).send("Error fetching users")
    } else {
      res.status(200).json(results)
    }
  })
})
// 个人详情的新闻页面
// 1是点赞   2是收藏   0是都不是
// 获取点赞的新闻
app.get("/likenews", (req, res) => {
  const query = "SELECT * FROM `news` WHERE coid = 1"
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Error:", error)
      res.status(500).send("An error occurred while saving the news")
    } else {
      res.status(200).json({ status: "success", data: results })
    }
  })
})
// 获取收藏新闻
app.get("/favoritenews", (req, res) => {
  const query = "SELECT * FROM `news` WHERE coid = 2"
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Error:", error)
      res.status(500).send("An error occurred while saving the news")
    } else {
      res.status(200).json({ status: "success", data: results })
    }
  })
})
// 获取体育新闻
app.get("/tiyunews", (req, res) => {
  const query = "SELECT * FROM `news` WHERE type = '体育' "
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Error:", error)
      res.status(500).send("An error occurred while saving the news")
    } else {
      res.status(200).json({ status: "success", data: results })
    }
  })
})
// 获取评论
app.get("/getcomments", (req, res) => {
  const query = "select * from comments"
  connection.query(query, (error, results) => {
    if (error) {
      res.status(500).send("获取评论失败", error)
    } else {
      res.status(200).json({
        status: "success",
        data: results,
      })
    }
  })
})
// 获取用户信息
app.get("/getuserinfo", (req, res) => {
  const query = "select * from users"
  connection.query(query, (error, results) => {
    if (error) {
      res.status(500).send("获取用户信息失败", error)
    } else {
      res.status(200).json({
        status: "success",
        data: results,
      })
    }
  })
})
// 修改用户信息
app.post("/updateuserinfo", (req, res) => {
  const { email, username, oldusername } = req.body
  console.log(email, username, oldusername)
  const query = "update users set username = ? ,email = ? where username = ?"
  connection.query(query, [username, email, oldusername], (error, results) => {
    if (error) {
      return res
        .status(500)
        .send({ message: "Error updating user information", error })
    }
    if (results.affectedRows === 0) {
      return res.status(404).send({ message: "User not found" })
    }
    res.send({ message: "User updated successfully" })
  })
})
// 用户提交评论到数据库中
app.post("/addcomment", (req, res) => {
  const { text } = req.body
  console.log(req.body)
  if (!text) {
    return res.status(400).json({ error: "没有评论内容" })
  }

  const query =
    "INSERT INTO comments (comment_text, posted_datetime, thumbs_up_count) VALUES (?, NOW(), 0)"
  connection.query(query, [text], (error, results) => {
    if (error) {
      return res.status(500).json({ error: "评论失败" })
    }
    res.status(201).json({
      message: "评论成功",
      commentId: results.insertId,
    })
  })
})
// 赞评论
app.post("/thumbcount", (req, res) => {
  const { commentId } = req.body
  console.log(req.body)
  const query =
    "update comments set thumbs_up_count =thumbs_up_count +1 where comment_id = ?"
  connection.query(query, [commentId], (error, results) => {
    if (error) {
      return res.status(500).json({ success: false, message: "数据库错误" })
    }
    if (results.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "comment not found" })
    }
    res.json({ success: true, message: "赞成功" })
  })
})
app.listen(3000, () => console.log("Server started on port 3000"))
