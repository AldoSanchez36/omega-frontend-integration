#!/usr/bin/env node

/**
 * Report Helper Utility
 * 
 * This utility provides consistent report generation and folder management
 * for all testing scripts. It ensures reports are saved in the tester-results
 * folder with proper naming conventions and timestamps.
 */

const fs = require('fs');
const path = require('path');

class ReportHelper {
  constructor() {
    this.resultsDir = path.join(__dirname, '..', 'tester-results');
    this.ensureResultsDirectory();
  }

  ensureResultsDirectory() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * Generate a timestamped filename for reports
   * @param {string} testName - Name of the test
   * @param {string} extension - File extension (default: 'json')
   * @returns {string} - Formatted filename
   */
  generateFilename(testName, extension = 'json') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sanitizedName = testName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${sanitizedName}-${timestamp}.${extension}`;
  }

  /**
   * Save a report to the tester-results folder
   * @param {string} testName - Name of the test
   * @param {Object} reportData - Report data to save
   * @param {string} extension - File extension (default: 'json')
   * @returns {string} - Path to the saved file
   */
  saveReport(testName, reportData, extension = 'json') {
    const filename = this.generateFilename(testName, extension);
    const filePath = path.join(this.resultsDir, filename);
    
    try {
      const content = extension === 'json' 
        ? JSON.stringify(reportData, null, 2)
        : reportData;
        
      fs.writeFileSync(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }

  /**
   * Save a JSON report with pretty formatting
   * @param {string} testName - Name of the test
   * @param {Object} reportData - Report data to save
   * @returns {string} - Path to the saved file
   */
  saveJsonReport(testName, reportData) {
    return this.saveReport(testName, reportData, 'json');
  }

  /**
   * Save a text report
   * @param {string} testName - Name of the test
   * @param {string} content - Text content to save
   * @returns {string} - Path to the saved file
   */
  saveTextReport(testName, content) {
    return this.saveReport(testName, content, 'txt');
  }

  /**
   * Save an HTML report
   * @param {string} testName - Name of the test
   * @param {string} htmlContent - HTML content to save
   * @returns {string} - Path to the saved file
   */
  saveHtmlReport(testName, htmlContent) {
    return this.saveReport(testName, htmlContent, 'html');
  }

  /**
   * Get the results directory path
   * @returns {string} - Path to the results directory
   */
  getResultsDirectory() {
    return this.resultsDir;
  }

  /**
   * List all reports in the results directory
   * @returns {Array} - Array of report files
   */
  listReports() {
    try {
      return fs.readdirSync(this.resultsDir)
        .filter(file => !file.startsWith('.'))
        .map(file => ({
          name: file,
          path: path.join(this.resultsDir, file),
          stats: fs.statSync(path.join(this.resultsDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean old reports (older than specified days)
   * @param {number} daysOld - Number of days to keep reports
   * @returns {number} - Number of files cleaned
   */
  cleanOldReports(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let cleanedCount = 0;
    const reports = this.listReports();
    
    reports.forEach(report => {
      if (report.stats.mtime < cutoffDate) {
        try {
          fs.unlinkSync(report.path);
          cleanedCount++;
        } catch (error) {
          console.warn(`Failed to delete old report: ${report.name}`);
        }
      }
    });
    
    return cleanedCount;
  }

  /**
   * Generate a summary report of all test results
   * @returns {Object} - Summary of all reports
   */
  generateSummaryReport() {
    const reports = this.listReports();
    const summary = {
      totalReports: reports.length,
      reports: reports.map(report => ({
        name: report.name,
        path: report.path,
        modified: report.stats.mtime,
        size: report.stats.size
      })),
      generatedAt: new Date().toISOString()
    };

    return summary;
  }
}

module.exports = { ReportHelper };



