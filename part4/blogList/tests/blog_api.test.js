const supertest = require('supertest')
const mongoose = require('mongoose')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')
const User = require('../models/user')

const  auth = {}

beforeEach(async () => {
  await Blog.deleteMany({})

  for (let blog of helper.initialBlogs) {
    let blogObject = new Blog(blog)
    await blogObject.save()
  }


  
})
describe('when there is initially some blogs saved', () => {
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs')

    expect(response.body).toHaveLength(helper.initialBlogs.length)
  })
})


test('verifies that the unique identifier property of the blog posts is named id', async () => {
  const response = await api.get('/api/blogs')

  expect(response.body[0].id).toBeDefined()
})

describe('addition of a new blog', () => {
  
  test('a valid blog can be added', async () => {
    await User.deleteMany({})

    const newUser = {
      username: "test user",
      name: "Testuser",
      password: "password",
    }

    await api
      .post('/api/users')
      .send(newUser)
    const response = await api
      .post('/api/login')
      .send({
        username: 'test user',
        password: 'password'
      })
    auth.token = response.body.token
    auth.dummy = auth.token + 'd'

    const newBlog = {
      title: "test title",
      author: "testman",
      url: "http://example.com",
      likes: 12
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', 'bearer ' + auth.token)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1)

    const contents = blogsAtEnd.map(n => n.title)
    expect(contents).toContain('test title')
  })

  test('add a invalid token with proper status code 401', async () => {
    const newBlog = {
      title: "test title",
      author: "testman",
      url: "http://example.com",
      likes: 12
    }
    
    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', 'bearer ' + auth.dummy)
      .expect(401)
  })

  test('blog without likes is likes to 0', async () => {
    const newBlog = {
      title: "test title",
      author: "testman",
      url: "http://example.com"
    }

    const createBlog = await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', 'bearer ' + auth.token)
      .expect(200)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1)
    expect(createBlog.body.likes).toBe(0)
  })

  test('blog without title is not added', async () => {
    const newBlog = {
      author: "testman",
      url: "http://example.com",
      likes: 12
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', 'bearer ' + auth.token)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })

  test('blog without author is not added', async () => {
    const newBlog = {
      title: "test title",
      url: "http://example.com",
      likes: 12
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', 'bearer ' + auth.token)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })
})

describe('deletion of a blog', () => {
  test('succeeds with status code 204 if id is valid', async () => {
    const newBlog = {
      title: "test title",
      author: "testman",
      url: "http://example.com",
      likes: 12
    }
    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', 'bearer ' + auth.token)
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[blogsAtStart.length - 1]
    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', 'bearer ' + auth.token)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).toHaveLength(
      blogsAtStart.length - 1
    )

    const title = blogsAtEnd.map(r => r.title)
    expect(title).not.toContain(blogToDelete.content)
  })

  test('delete a invalid token with proper status code 401', async () => {
    const newBlog = {
      title: "test title",
      author: "testman",
      url: "http://example.com",
      likes: 12
    }
    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', 'bearer ' + auth.token)
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[blogsAtStart.length - 1]
    
    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .send(newBlog)
      .set('Authorization', 'bearer ' + auth.dummy)
      .expect(401)
  })
})

describe('updation of a blog', () => {
  test('succeeds with status code 200 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToUpdate = blogsAtStart[0]
    const updateBlog = {
      title: "test title update",
      author: "testman update",
      url: "http://exampleupdate.com",
      likes: 15
    }

    const response = await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(updateBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)
    

    expect(response.body.title).toContain('test title update')

  })
})

afterAll(() => {
  mongoose.connection.close()
})