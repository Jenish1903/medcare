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

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      result: 1,
      data: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create service",
      error: error.message
    });
  }
};

// READ ALL
const getAllServices = async (req, res) => {
  try {
    const services = await Service.findAll({ where: { status_flag: 1 } });

    res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      result: services.length,
      data: services
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message
    });
  }
};

// UPDATE
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, update_user, status_flag } = req.body;

    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }

    await service.update({ name, image, update_user, status_flag });

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      result: 1,
      data: service
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error.message
    });
  }
};

// DELETE (Soft Delete)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }

    await service.update({ status_flag: 0 });

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      result: 1,
      data: { id }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message
    });
  }
};

module.exports = {
  createService,
  getAllServices,
  updateService,
  deleteService
};
