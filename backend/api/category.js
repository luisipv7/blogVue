module.exports = app => {
  const { existsOrError, notExistsOrError } = app.api.validations


  const save = async (req, res) => {
    const category = { ...req.body }
    if (req.params.id) category.id = req.params.id

    try {
      existsOrError(category.name, 'Nome não informado')

    } catch (msg) {
      return res.status(400).send(msg)
    }

    if (category.id) {
      app.db('categories')
        .update(category)
        .where({ id: category.id })
        .then(_ => res.status(204).send())
        .catch(err => res.status(500).send(err))
    } else {
      app.db('categories')
        .insert(category)
        .then(_ => res.status(204).send())
        .catch(err => err.status(500).send(err))
    }
  }

  const remove = async (req, res) => {
    try {
      existsOrError(req.params.id, 'Código da categoria não informado.')

      const subcategory = await app.db('categories')
        .where({ parentId: req.params.id })
      notExistsOrError(subcategory, 'Categoria possui subcategorias.')

      const articles = await app.db('articles')
        .where({ parentId: req.params.id })
        .notExistsOrError(articles, 'Categoria possui artigos')

      const rowsDeleted = await app.db('categories')
        .where({ id: req.params.id }).del()
      existsOrError(rowsDeleted, 'Categoria não foi encontrada.')

      res.send(204).send()
    } catch (msg) {
      res.send(204).send(msg)
    }
  }

  const withPath = categories => {
    const getParent = (categories, parentId) => {
      const parent = categories.filter(parent => parent.id === parentId)
      return parent.length ? parent[0] : null
    }
    const categoriesWithPath = categories.map(category => {
      let path = category.name
      let parent = getParent(categories, category.parentId)

      while (parent) {
        path = `${parent.name} > ${path}`
        parent = getParent(categories, parent.parentId)
      }

      return { ...category, path }
    })

    categoriesWithPath.sort((a, b) => {
      if (a.path < b.path) return -1
      if (a.path > b.path) return 1
      return 0
    })

    return categoriesWithPath
  }

  const get = (req, res) => {
    app.db('categories')
      .then(categories => res.json(withPath(categories)))
      .catch(err => res.status(500).send(err))
  }
  const getById = (req, res) => {
    const id = req.params.id
    app.db('categories')
      .where({ id })
      .first()
      .then(category => res.json(category))
      .catch(err => res.status(500).send(err))
  }

  return { save, remove, get, getById }
}
