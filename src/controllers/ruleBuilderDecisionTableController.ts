import { FastifyRequest, FastifyReply } from "fastify";
import RuleBuilderDecisionTable from "../models/ruleBuilderDecisionTableModel"
import { RuleBuilderDecisionTableData } from "../interfaces/ruleBuilderDecisionTableInterface";
import { baseSearch, advanceSearch } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId"
import ruleBuilderModel from "../models/ruleBuilderModel";
import Event from "../models/eventModel";
import playwright = require("playwright-core");
import { Module } from "../models/moduleModel";
import ExcelJS from 'exceljs';

export async function getDataById(
  request: FastifyRequest<{ Params: { program_id: string; rule_id: string }; Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { rule_id, program_id } = request.params;
  const searchCriteria = request.query || {}; // Default to empty object if no search criteria are provided

  try {
    const rule = await RuleBuilderDecisionTable.findOne({
      where: { rule_id, program_id },
      include: [
        {
          model: ruleBuilderModel,
          as: "rule",
          attributes: [
            "id", "rule_name", "rule_code", "is_enabled", "module_id", "rule_event_id", "rule_type",
            "effective_start_date", "effective_end_date", "created_on", "modified_on"
          ],
          include: [
            { model: Event, as: "event", attributes: ["id", "name"] },
            { model: Module, as: "module", attributes: ["id", "name"] }
          ]
        }
      ]
    });

    if (rule) {
      const ruleData = rule.toJSON();

      if (Array.isArray(ruleData.rules_json)) {
        const filteredRulesJson = ruleData.rules_json.filter((ruleObj: Record<string, any>) => {
          return Object.entries(searchCriteria).every(([key, value]) => {
            return ruleObj[key] !== undefined && ruleObj[key] === value;
          });
        });

        const responseObject = {
          status_code: 200,
          data: {
            ...ruleData,
            rules_json: filteredRulesJson
          },
          trace_id: generateCustomUUID(),
        };

        reply.send(responseObject);
      } else {
        reply.send({
          status_code: 200,
          data: {
            ...ruleData,
            rules_json: []
          },
          trace_id: generateCustomUUID(),
        });
      }
    } else {
      reply.status(200).send({ message: "Data Not Found" });
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({ message: "Internal Server Error" });
  }
}

export async function createData(
  data: Omit<RuleBuilderDecisionTableData, "_id">,
  reply: FastifyReply
) {
  try {
    const { program_id, rule_id } = data;
    const existingRecord = await RuleBuilderDecisionTable.findOne({
      where: { program_id, rule_id }
    });
    if (existingRecord) {
      await existingRecord.update(data);
      reply.status(200).send({
        status_code: 200,
        message: "Data Updated Successfully",
        data: existingRecord.id,
        trace_id: generateCustomUUID(),
      });
    } else {
      // If the record does not exist, create a new one
      const newItem = await RuleBuilderDecisionTable.create(data);
      reply.status(201).send({
        status_code: 201,
        message: "Data Created Successfully",
        data: newItem.id,
        trace_id: generateCustomUUID(),
      });
    }
  } catch (error) {
    reply.status(500).send({ message: "Failed To Create Or Update Data", error });
  }
}

export async function updateData(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const Data = request.body as RuleBuilderDecisionTableData;
  try {
    const data: RuleBuilderDecisionTable | null = await RuleBuilderDecisionTable.findByPk(id);
    if (data) {
      await data.update(Data);
      reply.status(200).send({
        status_code: 200,
        id: id,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({ message: "Data Not Found", data: [] });
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({ message: "Internal Server Error" });
  }
}

export async function updateDataWithRuleId(request: FastifyRequest, reply: FastifyReply) {
  const { rule_id } = request.params as { rule_id: string };
  const Data = request.body as RuleBuilderDecisionTableData;
  try {
    const data = await RuleBuilderDecisionTable.findOne({
      where: {
        rule_id: rule_id
      }
    })
    if (data) {
      await data.update(Data);
      reply.status(200).send({
        status_code: 200,
        id: rule_id,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({ message: "Data Not Found", data: [] });
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({ message: "Internal Server Error" });
  }
}

export async function deleteData(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  try {
    const field = await RuleBuilderDecisionTable.findByPk(id);
    if (field) {
      await field.update({ is_deleted: true });
      reply.status(200).send({
        status_code: 200,
        id: id,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({ message: "Data Not Found", data: [] });
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({ message: "Internal Server Error" });
  }
}

export async function searchData(request: FastifyRequest, reply: FastifyReply) {
  try {
    const searchFields = ["id", "program_id", "rule_id", "hierarchy_id", "is_enabled", "is_deleted"];
    const responseFields = ["id", "program_id", "rule_id", "hierarchy_id", "is_enabled", "is_deleted", "created_on", "modified_on"
    ];
    return await baseSearch(request, reply, RuleBuilderDecisionTable, searchFields, responseFields);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal Server Error' });
  }
}

export async function generateExcel(
  request: FastifyRequest<{ Params: { program_id: string; rule_id: string }; Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { rule_id, program_id } = request.params;
  const searchCriteria = request.query || {};

  try {
    const rule = await RuleBuilderDecisionTable.findOne({
      where: { rule_id, program_id },
      include: [
        {
          model: ruleBuilderModel,
          as: "rule",
          attributes: [
            "id", "rule_name", "rule_code", "is_enabled", "module_id", "rule_event_id", "rule_type",
            "effective_start_date", "effective_end_date", "created_on", "modified_on"
          ],
          include: [
            { model: Event, as: "event", attributes: ["id", "name"] },
            { model: Module, as: "module", attributes: ["id", "name"] }
          ]
        }
      ]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rules Data');

    if (rule) {
      const ruleData = rule.toJSON();
      if (Array.isArray(ruleData.rules_json)) {
        const filteredRulesJson = ruleData.rules_json.filter((ruleObj: Record<string, any>) => {
          return Object.entries(searchCriteria).every(([key, value]) => {
            return ruleObj[key] !== undefined && ruleObj[key] === value;
          });
        });

        if (filteredRulesJson.length > 0) {
          const headers = Object.keys(filteredRulesJson[0]).map(key => ({ header: key, key, width: Math.max(10, key.length) }));
          worksheet.columns = headers;
          filteredRulesJson.forEach((item: any) => {
            worksheet.addRow(item);
          });
          worksheet.getRow(1).font = { bold: true };
        }
      }

      if (worksheet.columns.length === 0) {
        worksheet.columns = [{ header: "", key: "no_data", width: 20 }];
        worksheet.addRow({ no_data: "" });
      }

      if (worksheet.columns) {
        worksheet.columns.forEach((column) => {
          let maxLength = 10;
          if (column && column.eachCell) {
            column.eachCell({ includeEmpty: true }, (cell) => {
              const columnLength = cell.value ? cell.value.toString().length : 10;
              if (columnLength > maxLength) {
                maxLength = columnLength;
              }
            });
            column.width = maxLength;
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();

      // Launch Playwright with Chromium
      const browser = await playwright.chromium.launch({ headless: true });
      const page = await browser.newPage();

      // Navigate to a page (optional, if required for any purpose)
      await page.goto('https://example.com');

      // Close the browser after use
      await browser.close();

      reply.header('Content-Disposition', 'attachment; filename=rules_data.xlsx');
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.send(buffer);
    } else {
      worksheet.columns = [{ header: "No Data Found", key: "no_data", width: 20 }];
      worksheet.addRow({ no_data: "No matching data found" });

      const buffer = await workbook.xlsx.writeBuffer();

      // Launch Playwright with Chromium
      const browser = await playwright.chromium.launch({ headless: true });
      const page = await browser.newPage();

      // Navigate to a page (optional, if required for any purpose)
      await page.goto('https://example.com');

      // Close the browser after use
      await browser.close();

      reply.header('Content-Disposition', 'attachment; filename=rules_data.xlsx');
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.send(buffer);
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({ message: "Internal Server Error" });
  }
}

export async function createRule(
  data: Omit<RuleBuilderDecisionTableData, "_id">,
  reply: FastifyReply
) {
  try {
    const { program_id, rule_event_id, module_id, payload } = data;

    const existingRecords = await RuleBuilderDecisionTable.findAll({
      where: {
        program_id,
        rule_event_id,
        module_id,
        is_enabled: true,
        is_deleted: false,
      },
    });

    if (existingRecords.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "Data Not Found",
        data: [],
        trace_id: generateCustomUUID(),
      });
    }

    const matchedRecords = existingRecords.filter(record => {
      const recordRulesJson = record.rules_json ? JSON.parse(JSON.stringify(record.rules_json)) : null;
      return recordRulesJson && deepEqual(payload, recordRulesJson);
    });

    if (matchedRecords.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "No Exact Match Found",
        data: [],
        trace_id: generateCustomUUID(),
      });
    }

    const sortedMatchedRecords = matchedRecords.sort((a, b) => {
      const dateA = new Date(a.created_on);
      const dateB = new Date(b.created_on);
      return dateA.getTime() - dateB.getTime();
    });

    const earliestMatchedRecord = sortedMatchedRecords[0];
    reply.status(200).send({
      status_code: 200,
      message: "Fetched Data Successfully",
      data: earliestMatchedRecord.rules_json,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    reply.status(500).send({ message: "Failed To Fetch Data", error });
  }
}

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true; // Same reference or primitive value
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}