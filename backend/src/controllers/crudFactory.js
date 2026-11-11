const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { parseDateOnly } = require("../utils/dates");

// Builds create / list / getOne / update / remove for any user-owned resource.
// EVERY query includes userId from the verified JWT (req.user), so users only touch their own data.
const makeCrudController = ({
  Model,
  label, // e.g. "Workout"
  fullSchema, // Zod schema for a COMPLETE record (also re-checks the merged result of a PATCH)
  toShape, // stored doc -> same shape the client sends (used to merge PATCH)
  mergePatch = (shape, patch) => ({ ...shape, ...patch }),
  prepare, // validated data -> fields to store (dates parsed, defaults applied)
  filterKeys = [], // query params that are plain equality filters
  dateField = "date", // field that from/to filter and sorting use
}) => {
  const notFound = () => new AppError(`${label} not found`, 404);

  const create = asyncHandler(async (req, res) => {
    const item = await Model.create({ ...prepare(req.body), userId: req.user._id });
    res.status(201).json({ success: true, message: `${label} created`, data: { item } });
  });

  const list = asyncHandler(async (req, res) => {
    const q = req.validatedQuery;
    const filter = { userId: req.user._id };

    if (q.from || q.to) {
      filter[dateField] = {};
      if (q.from) filter[dateField].$gte = parseDateOnly(q.from);
      if (q.to) filter[dateField].$lte = parseDateOnly(q.to);
    }
    filterKeys.forEach((k) => {
      if (q[k] !== undefined) filter[k] = q[k]; // values are Zod-validated enums
    });

    const dir = q.order === "asc" ? 1 : -1;
    const [items, total] = await Promise.all([
      Model.find(filter)
        .sort({ [dateField]: dir, _id: dir })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      Model.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        items,
        pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
      },
    });
  });

  const getOne = asyncHandler(async (req, res) => {
    const item = await Model.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) throw notFound();
    res.status(200).json({ success: true, data: { item } });
  });

  const update = asyncHandler(async (req, res) => {
    const item = await Model.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) throw notFound(); // same 404 for "doesn't exist" and "belongs to someone else"

    const merged = mergePatch(toShape(item.toObject()), req.body);
    const result = fullSchema.safeParse(merged);
    if (!result.success) {
      throw new AppError(
        "Validation failed",
        400,
        result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
      );
    }

    item.set(prepare(result.data));
    await item.save();
    res.status(200).json({ success: true, message: `${label} updated`, data: { item } });
  });

  const remove = asyncHandler(async (req, res) => {
    const deleted = await Model.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) throw notFound();
    res.status(200).json({ success: true, message: `${label} deleted` });
  });

  return { create, list, getOne, update, remove };
};

module.exports = makeCrudController;
