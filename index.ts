const { ApolloServer, gql } = require('apollo-server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


const typeDefs = gql`
  type User {
    id: Int!
    email: String!
    firstName: String
    lastName: String
    posts: [Post!]!
  }

  type Post {
    id: Int!
    title: String!
    content: String
    published: Boolean!
    author: User!
    tags: [Tag!]!
  }

  type Tag{
    id: Int!
    title: String!
    post: Post! 
  }

  type Query {
    user(id: Int!): User!
    posts(userId: Int!): [Post!]!
    post(id: Int!): Post
  }

  type Mutation {
    createUser(email: String!, firstName: String, lastName: String): User!
    createPost(title: String!, content: String, published: Boolean!, authorId: Int!): Post!
    createTag(title: String!, postId: Int!): Tag!
    deletePost(postId: Int!): Post!
    deleteUser(userId: Int!): User!
  }
`;

const resolvers = {
  Query: {
    user: (_, { id }) => prisma.user.findUnique({ where: { id } }),
    posts: (_, { userId }) => prisma.user.findUnique({ where: { id: userId } }).posts(),
    post: (_, { id }) => prisma.post.findUnique({ where: { id }, include: { tags: true } }),
  },
  Mutation: {
    createUser: (_, { email, firstName, lastName }) =>
      prisma.user.create({ data: { email, firstName, lastName } }),

    createPost: async (_, { title, content, published, authorId }) => {
      const post = await prisma.post.create({
        data: {
          title,
          content,
          published,
          authorId,
        },
      });
    
      return post;
    },


    createTag: async (_, { title, postId }, context) => {
      const tag = await context.prisma.tag.create({
        data: {
          title,
          Post: {
            connect: { id: postId }
          }
        }
      });
    
      return tag;
    },
    
      
    deletePost: (_, { postId }) =>
    prisma.post.delete({ where: { id: postId } }),

    deleteUser: async (_, { userId }) => {
      const user = await prisma.user.findUnique({ where: { id: userId } });
    
      if (!user) {
        throw new Error(`User with ID ${userId} not found.`);
      }
    
      await prisma.post.deleteMany({ where: { authorId: userId } });
      await prisma.user.delete({ where: { id: userId } });
    
      return user;
    },
    
  },
  User: {
    posts: (parent) => prisma.user.findUnique({ where: { id: parent.id } }).posts(),
  },
  Post: {
    author: (parent) => prisma.post.findUnique({ where: { id: parent.id } }).author(),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: {
    prisma, // Incluez PrismaClient dans le contexte
  },
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
