module.exports = (sequelize, DataTypes) => {
  const CallRecording = sequelize.define("CallRecording", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    file_name: { type: DataTypes.STRING },
    file_path: { type: DataTypes.STRING },
    file_size: { type: DataTypes.FLOAT },
    duration: { type: DataTypes.FLOAT },
    create_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    status_flag: { type: DataTypes.TINYINT, defaultValue: 1 },
  }, {
    tableName: "tbl_call_recordings",
    timestamps: false
  });

  return CallRecording;
};
