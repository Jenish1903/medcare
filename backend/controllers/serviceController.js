const Service = require('../models/serviceModel');

// CREATE
const createService = async (req, res) => {
  try {
    const { name, image, create_user } = req.body;

    const service = await Service.create({
      name,
      image,
      create_user,
      update_user: create_user
    });

    const response = {
      id: service.id,
      name: service.name,
      image: service.image,
      status_flag: service.status_flag,
      create_date: service.create_date,
      update_date: service.update_date,
      create_user: service.create_user,
      update_user: service.update_user
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// READ ALL
const getAllServices = async (req, res) => {
  try {
    const services = await Service.findAll({ where: { status_flag: 1 } });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, update_user, status_flag } = req.body;

    const service = await Service.findByPk(id);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    await service.update({ name, image, update_user, status_flag });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE (Soft Delete)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByPk(id);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    await service.update({ status_flag: 0 });
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createService,
  getAllServices,
  updateService,
  deleteService
};
